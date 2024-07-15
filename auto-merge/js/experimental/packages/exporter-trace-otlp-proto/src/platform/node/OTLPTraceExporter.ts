/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { getEnv, baggageUtils } from '@opentelemetry/core';
import {
  OTLPExporterNodeConfigBase,
  appendResourcePathToUrl,
  appendRootPathToUrlIfNeeded,
  OTLPExporterNodeBase,
  parseHeaders,
} from '@opentelemetry/otlp-exporter-base';
import {
  IExportTraceServiceResponse,
  ProtobufTraceSerializer,
} from '@opentelemetry/otlp-transformer';
import { VERSION } from '../../version';

const DEFAULT_COLLECTOR_RESOURCE_PATH = 'v1/traces';
const DEFAULT_COLLECTOR_URL = `http://localhost:4318/${DEFAULT_COLLECTOR_RESOURCE_PATH}`;
const USER_AGENT = {
  'User-Agent': `OTel-OTLP-Exporter-JavaScript/${VERSION}`,
};

/**
 * Collector Trace Exporter for Node with protobuf
 */
export class OTLPTraceExporter
  extends OTLPExporterNodeBase<ReadableSpan, IExportTraceServiceResponse>
  implements SpanExporter
{
  constructor(config: OTLPExporterNodeConfigBase = {}) {
    super(config, ProtobufTraceSerializer, 'application/x-protobuf');
    const env = getEnv();
    this.headers = {
      ...this.headers,
      ...USER_AGENT,
      ...baggageUtils.parseKeyPairsIntoRecord(
        env.OTEL_EXPORTER_OTLP_TRACES_HEADERS
      ),
      ...parseHeaders(config?.headers),
    };
  }

  getDefaultUrl(config: OTLPExporterNodeConfigBase) {
    if (typeof config.url === 'string') {
      return config.url;
    }

    const env = getEnv();
    if (env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT.length > 0) {
      return appendRootPathToUrlIfNeeded(
        env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
      );
    }

    if (env.OTEL_EXPORTER_OTLP_ENDPOINT.length > 0) {
      return appendResourcePathToUrl(
        env.OTEL_EXPORTER_OTLP_ENDPOINT,
        DEFAULT_COLLECTOR_RESOURCE_PATH
      );
    }

    return DEFAULT_COLLECTOR_URL;
  }
}
