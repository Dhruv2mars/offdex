export type LaunchIntentEventPayload = {
  url: string;
};

export type LaunchIntentModuleEvents = {
  onUrl: (params: LaunchIntentEventPayload) => void;
};
