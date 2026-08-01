import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const TAG = "[MicChannelSelector]";

const settings = definePluginSettings({
    channel: {
        type: OptionType.SELECT,
        description: "Which microphone channel should be sent to Discord",
        options: [
            {
                label: "Left",
                value: "left",
            },
            {
                label: "Right",
                value: "right",
            },
            {
                label: "Stereo",
                value: "stereo",
                default: true,
            },
        ],
    },
});

let originalGetUserMedia:
    typeof navigator.mediaDevices.getUserMedia | null = null;

const activeContexts = new Set<AudioContext>();

export default definePlugin({
    name: "MicChannelSelector",

    description:
        "Select which channel of a stereo microphone should be sent to Discord",

    authors: [
        {
            name: "iamspellcaster",
        },
    ],

    settings,

    start() {
        const mediaDevices = navigator.mediaDevices;

        if (!mediaDevices?.getUserMedia) {
            console.error(TAG, "getUserMedia is unavailable");
            return;
        }

        if (originalGetUserMedia) {
            console.warn(TAG, "Hook is already installed");
            return;
        }

        originalGetUserMedia =
            mediaDevices.getUserMedia.bind(mediaDevices);

        mediaDevices.getUserMedia = async function (constraints) {
            /*
             * Only modify requests that actually contain audio.
             */
            if (!constraints.audio) {
                return originalGetUserMedia!(constraints);
            }

            const selectedChannel = settings.store.channel;

            console.group(TAG, "getUserMedia()");
            console.log(
                "Selected channel:",
                selectedChannel
            );

            console.log(
                "Original constraints:",
                constraints
            );

            /*
             * Ask the device for stereo.
             */
            const modifiedConstraints =
                structuredClone(constraints);

            if (typeof modifiedConstraints.audio === "object") {
                modifiedConstraints.audio.channelCount = {
                    ideal: 2,
                };
            } else {
                modifiedConstraints.audio = {
                    channelCount: {
                        ideal: 2,
                    },
                };
            }

            console.log(
                "Modified constraints:",
                modifiedConstraints
            );

            try {
                const originalStream =
                    await originalGetUserMedia!(
                        modifiedConstraints
                    );

                const originalTrack =
                    originalStream.getAudioTracks()[0];

                if (!originalTrack) {
                    console.warn(
                        TAG,
                        "No audio track found"
                    );

                    console.groupEnd();

                    return originalStream;
                }

                console.log(
                    "Input track:",
                    originalTrack
                );

                console.log(
                    "Input settings:",
                    originalTrack.getSettings()
                );

                /*
                 * Stereo mode:
                 *
                 * Don't process anything.
                 *
                 * Return the original stream.
                 */
                if (selectedChannel === "stereo") {
                    console.log(
                        TAG,
                        "Using original stereo stream"
                    );

                    console.groupEnd();

                    return originalStream;
                }

                /*
                 * Left / Right mode.
                 *
                 * Create Web Audio processing graph.
                 */
                const audioContext =
                    new AudioContext();

                activeContexts.add(audioContext);

                const source =
                    audioContext.createMediaStreamSource(
                        originalStream
                    );

                /*
                 * Split:
                 *
                 * output 0 = Left
                 * output 1 = Right
                 */
                const splitter =
                    audioContext.createChannelSplitter(2);

                source.connect(splitter);

                /*
                 * Create stereo output.
                 *
                 * The selected input channel will be
                 * copied to BOTH output channels.
                 */
                const merger =
                    audioContext.createChannelMerger(2);

                const inputChannel =
                    selectedChannel === "left"
                        ? 0
                        : 1;

                /*
                 * Selected channel -> output Left
                 */
                splitter.connect(
                    merger,
                    inputChannel,
                    0
                );

                /*
                 * Selected channel -> output Right
                 */
                splitter.connect(
                    merger,
                    inputChannel,
                    1
                );

                /*
                 * Convert Web Audio back into MediaStream.
                 */
                const destination =
                    audioContext.createMediaStreamDestination();

                merger.connect(destination);

                const outputStream =
                    destination.stream;

                const outputTrack =
                    outputStream.getAudioTracks()[0];

                console.log(
                    TAG,
                    "Processed stream:",
                    outputStream
                );

                console.log(
                    TAG,
                    "Processed track:",
                    outputTrack
                );

                console.log(
                    TAG,
                    "Processed track settings:",
                    outputTrack.getSettings()
                );

                /*
                 * Cleanup.
                 */
                outputTrack.addEventListener(
                    "ended",
                    () => {
                        console.log(
                            TAG,
                            "Output track ended"
                        );

                        audioContext.close();
                        activeContexts.delete(
                            audioContext
                        );
                    },
                    { once: true }
                );

                originalTrack.addEventListener(
                    "ended",
                    () => {
                        console.log(
                            TAG,
                            "Original track ended"
                        );

                        if (audioContext.state !== "closed") {
                            audioContext.close();
                        }

                        activeContexts.delete(
                            audioContext
                        );
                    },
                    { once: true }
                );

                console.groupEnd();

                return outputStream;
            } catch (error) {
                console.error(
                    TAG,
                    "getUserMedia failed:",
                    error
                );

                console.groupEnd();

                throw error;
            }
        };

        console.log(
            TAG,
            "Hook installed"
        );

        console.log(
            TAG,
            "Current channel:",
            settings.store.channel
        );
    },

    stop() {
        if (originalGetUserMedia) {
            navigator.mediaDevices.getUserMedia =
                originalGetUserMedia;

            originalGetUserMedia = null;
        }

        for (const context of activeContexts) {
            if (context.state !== "closed") {
                context.close();
            }
        }

        activeContexts.clear();

        console.log(
            TAG,
            "Hook removed"
        );
    },
});