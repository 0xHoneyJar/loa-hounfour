/**
 * Generate AsyncAPI 3.0 specification for event-driven schemas.
 *
 * Documents DomainEvent, DomainEventBatch, and StreamEvent channels
 * for cross-ecosystem discovery.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRACT_VERSION } from '../src/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'specs');

const schemaBaseUrl = `https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}`;

const asyncapiSpec = `asyncapi: 3.0.0

info:
  title: loa-hounfour Event Protocol
  version: '${CONTRACT_VERSION}'
  description: |
    Event-driven protocol contracts for the loa-finn ↔ arrakis integration layer.
    Defines domain events, event batches, and SSE stream events for NFT-bound AI agents.
  license:
    name: MIT
  contact:
    name: 0xHoneyJar
    url: https://github.com/0xHoneyJar/loa-hounfour

channels:
  domainEvents:
    address: domain-events
    description: |
      Individual domain events emitted by aggregates (agent, billing, conversation, transfer, tool, message).
      Event type follows three-segment dotted convention: {aggregate}.{noun}.{verb}
    messages:
      domainEvent:
        $ref: '#/components/messages/DomainEvent'

  domainEventBatches:
    address: domain-event-batches
    description: |
      Atomic multi-event batches with shared correlation_id.
      Used for complex operations (transfers) that emit multiple events atomically.
    messages:
      domainEventBatch:
        $ref: '#/components/messages/DomainEventBatch'

  streamEvents:
    address: stream-events
    description: |
      SSE stream events for real-time model response streaming.
      6 event types with strict ordering: start → chunks/tools → usage → end.
    messages:
      streamEvent:
        $ref: '#/components/messages/StreamEvent'

operations:
  publishDomainEvent:
    action: send
    channel:
      $ref: '#/channels/domainEvents'
    summary: Publish a domain event
    description: |
      Emitted by aggregates when state changes occur.
      Consumers filter by aggregate_type and event type segments.

  publishDomainEventBatch:
    action: send
    channel:
      $ref: '#/channels/domainEventBatches'
    summary: Publish an atomic event batch
    description: |
      Emitted during complex operations (e.g., NFT transfers) that produce
      multiple correlated events. Consumers process all events atomically.

  publishStreamEvent:
    action: send
    channel:
      $ref: '#/channels/streamEvents'
    summary: Publish an SSE stream event
    description: |
      Real-time streaming of model responses via Server-Sent Events.

components:
  messages:
    DomainEvent:
      name: DomainEvent
      title: Domain Event
      summary: Generic event envelope with typed aggregate routing
      contentType: application/json
      payload:
        schemaFormat: application/schema+json;version=draft-2020-12
        schema:
          $ref: '${schemaBaseUrl}/domain-event'
      examples:
        - name: AgentLifecycleTransition
          summary: Agent transitions from DORMANT to PROVISIONING
          payload:
            event_id: evt_001
            aggregate_id: 'eip155:1/0x5Af0D9827E0c53E4799BB226655A1de152A425a5/42'
            aggregate_type: agent
            type: agent.lifecycle.transitioned
            version: 1
            occurred_at: '2026-01-15T10:00:00Z'
            actor: system
            payload:
              agent_id: agent_abc
              from: DORMANT
              to: PROVISIONING
            contract_version: '${CONTRACT_VERSION}'

    DomainEventBatch:
      name: DomainEventBatch
      title: Domain Event Batch
      summary: Atomic multi-event delivery with shared correlation
      contentType: application/json
      payload:
        schemaFormat: application/schema+json;version=draft-2020-12
        schema:
          $ref: '${schemaBaseUrl}/domain-event-batch'
      examples:
        - name: TransferBatch
          summary: Transfer produces lifecycle + conversation seal + billing events
          payload:
            batch_id: batch_xfer_001
            correlation_id: corr_xfer_001
            events:
              - event_id: evt_b1_001
                aggregate_id: agent_abc
                aggregate_type: agent
                type: agent.lifecycle.transitioned
                version: 1
                occurred_at: '2026-01-15T10:00:00Z'
                actor: transfer-service
                payload:
                  agent_id: agent_abc
                  from: ACTIVE
                  to: TRANSFERRED
                contract_version: '${CONTRACT_VERSION}'
            source: transfer-service
            produced_at: '2026-01-15T10:00:01Z'
            contract_version: '${CONTRACT_VERSION}'

    StreamEvent:
      name: StreamEvent
      title: Stream Event
      summary: SSE stream event (discriminated union)
      contentType: application/json
      payload:
        schemaFormat: application/schema+json;version=draft-2020-12
        schema:
          $ref: '${schemaBaseUrl}/stream-event'
`;

mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'asyncapi.yaml');
writeFileSync(outPath, asyncapiSpec);
console.log(`Generated: ${outPath}`);
