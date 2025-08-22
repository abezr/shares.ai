export interface ServiceProfileCreatedEvent {
  eventId: string; // uuid-v4
  timestamp: string; // ISO 8601
  eventType: "ServiceProfileCreated";
  data: {
    serviceProfileId: string;
    name: string;
    goals: Record<string, any>;
    source_content?: string | null;
    target_provider?: string | null;
  };
}
