/**
 * Pipeline Module
 * 
 * Feature module for the planified file actions system.
 * Provides pipeline management, execution, and real-time streaming capabilities.
 * 
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md
 */

import { Module } from "@nestjs/common";
import { PipelineController } from "./controllers/pipeline.controller";
import { PipelineService } from "./services/pipeline.service";
import { PipelineExecutorService } from "./services/pipeline-executor.service";
import { PipelineEventService } from "./events/pipeline-event.service";

@Module({
  controllers: [PipelineController],
  providers: [
    PipelineService,
    PipelineExecutorService,
    PipelineEventService,
  ],
  exports: [
    PipelineService,
    PipelineExecutorService,
    PipelineEventService,
  ],
})
export class PipelineModule {}
