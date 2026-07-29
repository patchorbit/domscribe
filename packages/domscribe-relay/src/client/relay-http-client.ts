/**
 * RelayHttpClient - Typed HTTP client for the relay server API
 *
 * Used by the MCP adapter, CLI commands, and browser overlay to
 * communicate with the running relay server.
 *
 * @module @domscribe/relay/client/relay-http-client
 */
import {
  AnnotationContext,
  AnnotationId,
  AnnotationInteraction,
  AnnotationStatus,
  API_PATHS,
  DomscribeError,
  DomscribeErrorCode,
  InteractionMode,
  ManifestEntryId,
} from '@domscribe/core';
import {
  AnnotationCreateResponse,
  AnnotationCreateResponseSchema,
  QueryBySourceResponse,
  QueryBySourceResponseSchema,
  AnnotationGetResponse,
  AnnotationGetResponseSchema,
  AnnotationListResponse,
  AnnotationListResponseSchema,
  AnnotationPatchRequestBody,
  AnnotationPatchResponse,
  AnnotationPatchResponseSchema,
  AnnotationProcessResponse,
  AnnotationProcessResponseSchema,
  AnnotationSearchResponse,
  AnnotationSearchResponseSchema,
  AnnotationUpdateResponseResponse,
  AnnotationUpdateResponseResponseSchema,
  AnnotationUpdateStatusResponse,
  AnnotationUpdateStatusResponseSchema,
  HealthResponse,
  HealthResponseSchema,
  ManifestBatchResolveResponse,
  ManifestBatchResolveResponseSchema,
  ManifestQueryResponse,
  ManifestQueryResponseSchema,
  ManifestResolveResponse,
  ManifestResolveResponseSchema,
  ManifestStatsResponse,
  ManifestStatsResponseSchema,
  ShutdownResponse,
  ShutdownResponseSchema,
  StatusResponse,
  StatusResponseSchema,
  ExpectedChangeInput,
  VerifyBaselineResponse,
  VerifyBaselineResponseSchema,
  VerifyCheckResponse,
  VerifyCheckResponseSchema,
} from '../schema.js';
import {
  RelayErrorResponse,
  RelayErrorResponseSchema,
} from '../server/types.js';

export class RelayHttpClient {
  private readonly baseUrl: URL;

  constructor(
    private readonly host: string,
    private readonly port: number,
  ) {
    this.baseUrl = new URL('/', `http://${this.host}:${this.port}`);
  }

  async createAnnotation({
    mode,
    interaction,
    context,
  }: {
    mode: InteractionMode;
    interaction: AnnotationInteraction;
    context: AnnotationContext;
  }): Promise<AnnotationCreateResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.ANNOTATIONS}`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode, interaction, context }),
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return AnnotationCreateResponseSchema.parse(await response.json());
  }

  async deleteAnnotation(annotationId: string): Promise<void> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.ANNOTATION_BY_ID.replace(':id', annotationId)}`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return;
  }

  async getAnnotation(annotationId: string): Promise<AnnotationGetResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.ANNOTATION_BY_ID.replace(':id', annotationId)}`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw await this.parseError(response);
    }
    return AnnotationGetResponseSchema.parse(await response.json());
  }

  async listAnnotations({
    statuses,
    limit,
    offset,
  }: {
    statuses?: AnnotationStatus[];
    limit?: number;
    offset?: number;
  }): Promise<AnnotationListResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.ANNOTATIONS}`;
    const url = new URL(apiPath, this.baseUrl);
    if (statuses) {
      url.searchParams.set('status', statuses.join(','));
    }
    if (limit) {
      url.searchParams.set('limit', limit.toString());
    }
    if (offset) {
      url.searchParams.set('offset', offset.toString());
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return AnnotationListResponseSchema.parse(await response.json());
  }

  async processAnnotation(): Promise<AnnotationProcessResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.ANNOTATION_PROCESS}`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return AnnotationProcessResponseSchema.parse(await response.json());
  }

  async searchAnnotations({
    query,
    entryId,
    file,
    status,
    limit,
  }: {
    query?: string;
    entryId?: string;
    file?: string;
    status?: string;
    limit?: number;
  }): Promise<AnnotationSearchResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.ANNOTATION_SEARCH}`;
    const url = new URL(apiPath, this.baseUrl);

    if (query) {
      url.searchParams.set('query', query);
    }
    if (entryId) {
      url.searchParams.set('entryId', entryId);
    }
    if (file) {
      url.searchParams.set('file', file);
    }
    if (status) {
      url.searchParams.set('status', status);
    }
    if (limit) {
      url.searchParams.set('limit', limit.toString());
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return AnnotationSearchResponseSchema.parse(await response.json());
  }

  async updateAnnotationResponse(
    annotationId: string,
    message: string,
  ): Promise<AnnotationUpdateResponseResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.ANNOTATION_RESPONSE.replace(':id', annotationId)}`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
      }),
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return AnnotationUpdateResponseResponseSchema.parse(await response.json());
  }

  async updateAnnotationStatus(
    annotationId: AnnotationId,
    status: AnnotationStatus,
    {
      errorDetails,
    }: {
      errorDetails?: string;
    },
  ): Promise<AnnotationUpdateStatusResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.ANNOTATION_BY_ID.replace(':id', annotationId)}/status`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        errorDetails,
      }),
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return AnnotationUpdateStatusResponseSchema.parse(await response.json());
  }

  async patchAnnotation(
    annotationId: AnnotationId,
    body: AnnotationPatchRequestBody,
  ): Promise<AnnotationPatchResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.ANNOTATION_BY_ID.replace(':id', annotationId)}`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return AnnotationPatchResponseSchema.parse(await response.json());
  }

  async queryManifestEntries({
    file,
    componentName,
    tagName,
    limit,
  }: {
    file?: string;
    componentName?: string;
    tagName?: string;
    limit?: number;
  }): Promise<ManifestQueryResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.MANIFEST_QUERY}`;
    const url = new URL(apiPath, this.baseUrl);
    if (file) {
      url.searchParams.set('file', file);
    }
    if (componentName) {
      url.searchParams.set('componentName', componentName);
    }
    if (tagName) {
      url.searchParams.set('tagName', tagName);
    }
    if (limit) {
      url.searchParams.set('limit', limit.toString());
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return ManifestQueryResponseSchema.parse(await response.json());
  }

  async batchResolveManifestEntries(
    entryIds: ManifestEntryId[],
  ): Promise<ManifestBatchResolveResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.MANIFEST_RESOLVE_BATCH}`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entryIds }),
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return ManifestBatchResolveResponseSchema.parse(await response.json());
  }

  async resolveManifestEntry(
    entryId: ManifestEntryId,
  ): Promise<ManifestResolveResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.MANIFEST_RESOLVE}`;
    const url = new URL(apiPath, this.baseUrl);
    url.searchParams.set('id', entryId);

    const response = await fetch(url.toString(), {
      method: 'GET',
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return ManifestResolveResponseSchema.parse(await response.json());
  }

  async queryBySource(params: {
    file: string;
    line: number;
    column?: number;
    tolerance?: number;
    includeRuntime?: boolean;
  }): Promise<QueryBySourceResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.MANIFEST_RESOLVE_BY_SOURCE}`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return QueryBySourceResponseSchema.parse(await response.json());
  }

  async verifyBaseline(params: {
    entryId: ManifestEntryId;
  }): Promise<VerifyBaselineResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.VERIFY_BASELINE}`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return VerifyBaselineResponseSchema.parse(await response.json());
  }

  async verifyCheck(params: {
    baselineId: string;
    expectedChanges?: ExpectedChangeInput[];
    annotationId?: string;
  }): Promise<VerifyCheckResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.VERIFY_CHECK}`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return VerifyCheckResponseSchema.parse(await response.json());
  }

  async getManifestStats(): Promise<ManifestStatsResponse> {
    const apiPath = `${API_PATHS.BASE.replace(':version', 'v1')}${API_PATHS.MANIFEST_STATS}`;
    const url = new URL(apiPath, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'GET',
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return ManifestStatsResponseSchema.parse(await response.json());
  }

  async getStatus(): Promise<StatusResponse> {
    const url = new URL(API_PATHS.STATUS, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'GET',
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return StatusResponseSchema.parse(await response.json());
  }

  async getHealth({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<HealthResponse> {
    const url = new URL(API_PATHS.HEALTH, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal,
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return HealthResponseSchema.parse(await response.json());
  }

  async shutdown(
    nonce: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ShutdownResponse> {
    const url = new URL(API_PATHS.SHUTDOWN, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nonce }),
      signal,
    });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    return ShutdownResponseSchema.parse(await response.json());
  }

  private async parseError(response: Response): Promise<RelayError> {
    try {
      const body = RelayErrorResponseSchema.parse(await response.json());
      return new RelayError(body);
    } catch {
      // Unparseable response (proxy 502, HTML error page, etc.)
      return new RelayError({
        code: DomscribeErrorCode.DS_RELAY_UNAVAILABLE,
        error: `Relay returned ${response.status}`,
        hint: 'Is the relay server running?',
      });
    }
  }
}

export class RelayError extends DomscribeError {
  public readonly hint?: string;

  constructor(response: RelayErrorResponse) {
    super({
      code: response.code,
      title: response.error,
      detail: response.detail,
      status: response.status,
      instance: response.instance,
      extensions: {
        ...response.extensions,
        ...(response.hint ? { hint: response.hint } : {}),
      },
    });
    this.hint = response.hint;
  }
}
