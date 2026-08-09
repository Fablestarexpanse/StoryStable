# Service Boundaries

Frontend components call application services; they never read provider APIs
or mutate domain files directly.

Required services (PRODUCT_SPEC_V0.2 section 11): ProjectService, VaultService,
SchemaService, IndexService, SearchService, GraphService, ViewQueryService,
StoryService, StateService, KnowledgeService, ContextService, AgentService,
ModelGateway, AssetService, ReferenceService, WorkflowRegistry, ComfyUIAdapter,
H3CompilerService, RenderQueueService, ResourceCoordinator, MediaService,
ReviewService, TimelineService, ExportService, ProjectHealthService,
SecretsService, SettingsService, EventBus.

Detailed contracts are specified here as each service is implemented,
beginning in Phase 1.
