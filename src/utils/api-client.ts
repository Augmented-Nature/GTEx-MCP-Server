/**
 * GTEx Portal API Client
 * Handles all HTTP communication with the GTEx Portal API v2
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  GTExApiResponse,
  ServiceInfo,
  DatasetInfo,
  Gene,
  Variant,
  GeneExpression,
  MedianGeneExpression,
  MedianTranscriptExpression,
  TopExpressedGene,
  ExpressionPCA,
  SingleNucleusGeneExpression,
  SingleNucleusSummary,
  EQTLGene,
  SingleTissueEQTL,
  MultiTissueEQTL,
  DynamicEQTLResult,
  SQTLGene,
  FineMapping,
  TissueSiteDetail,
  Sample,
  Subject,
  BiobankSample,
  Transcript,
  SearchGenesParams,
  GetGeneExpressionParams,
  GetEQTLGenesParams,
  GetSingleTissueEQTLsParams,
  CalculateDynamicEQTLParams,
  GetVariantsParams,
  GetSamplesParams
} from '../types/gtex-types.js';

export class GTExApiClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly baseURL = 'https://gtexportal.org/api/v2';

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'GTEx-MCP-Server/1.0.0'
      }
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const errorData: GTExApiResponse<any> = {
          error: this.formatError(error),
          status: error.response?.status
        };
        return Promise.resolve({ data: errorData });
      }
    );
  }

  /**
   * Format error messages consistently
   */
  private formatError(error: AxiosError): string {
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      
      switch (status) {
        case 400:
          return `Bad Request: ${statusText}. Please check your parameters.`;
        case 404:
          return `Not Found: The requested resource was not found.`;
        case 422:
          return `Validation Error: ${statusText}. Please check your input parameters.`;
        case 500:
          return `Server Error: ${statusText}. Please try again later.`;
        default:
          return `HTTP ${status}: ${statusText}`;
      }
    } else if (error.request) {
      return 'Network error: Unable to connect to GTEx Portal API.';
    } else {
      return `Request error: ${error.message}`;
    }
  }

  /**
   * Build query parameters from object
   */
  private buildQueryParams(params: Record<string, any>): URLSearchParams {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => queryParams.append(key, item.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
    
    return queryParams;
  }

  // ===== SERVICE INFO =====
  
  /**
   * Get general information about the GTEx service
   */
  async getServiceInfo(): Promise<GTExApiResponse<ServiceInfo>> {
    try {
      const response = await this.axiosInstance.get('/');
      return { data: response.data };
    } catch (error) {
      return error as GTExApiResponse<ServiceInfo>;
    }
  }

  // ===== DATASET INFO =====
  
  /**
   * Get dataset information
   */
  async getDatasetInfo(datasetId?: string): Promise<GTExApiResponse<DatasetInfo[]>> {
    try {
      const params = datasetId ? { datasetId } : {};
      const queryParams = this.buildQueryParams(params);
      const response = await this.axiosInstance.get(`/metadata/dataset?${queryParams}`);
      return { data: response.data };
    } catch (error) {
      return error as GTExApiResponse<DatasetInfo[]>;
    }
  }

  // ===== GENE AND REFERENCE DATA =====
  
  /**
   * Search for genes by symbol, ID, or other criteria
   */
  async searchGenes(params: SearchGenesParams): Promise<GTExApiResponse<Gene[]>> {
    try {
      const queryParams = this.buildQueryParams({
        geneId: params.geneId,
        gencodeVersion: params.gencodeVersion || 'v26',
        genomeBuild: params.genomeBuild || 'GRCh38/hg38',
        page: params.page || 0,
        itemsPerPage: params.itemsPerPage || 250
      });
      const response = await this.axiosInstance.get(`/reference/geneSearch?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<Gene[]>;
    }
  }

  /**
   * Get detailed information about specific genes
   */
  async getGenes(
    geneIds: string[],
    gencodeVersion: string = 'v26',
    genomeBuild: string = 'GRCh38/hg38'
  ): Promise<GTExApiResponse<Gene[]>> {
    try {
      const queryParams = this.buildQueryParams({
        geneId: geneIds,
        gencodeVersion,
        genomeBuild,
        page: 0,
        itemsPerPage: Math.min(geneIds.length, 1000)
      });
      const response = await this.axiosInstance.get(`/reference/gene?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<Gene[]>;
    }
  }

  /**
   * Get transcripts for a gene
   */
  async getTranscripts(
    gencodeId: string,
    gencodeVersion: string = 'v26',
    genomeBuild: string = 'GRCh38/hg38'
  ): Promise<GTExApiResponse<Transcript[]>> {
    try {
      const queryParams = this.buildQueryParams({
        gencodeId,
        gencodeVersion,
        genomeBuild,
        page: 0,
        itemsPerPage: 250
      });
      const response = await this.axiosInstance.get(`/reference/transcript?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<Transcript[]>;
    }
  }

  /**
   * Get neighboring genes around a genomic position
   */
  async getNeighborGenes(
    chromosome: string,
    position: number,
    window: number,
    gencodeVersion: string = 'v26',
    genomeBuild: string = 'GRCh38/hg38'
  ): Promise<GTExApiResponse<Gene[]>> {
    try {
      const queryParams = this.buildQueryParams({
        chromosome,
        pos: position,
        bp_window: window,
        gencodeVersion,
        genomeBuild,
        page: 0,
        itemsPerPage: 250
      });
      const response = await this.axiosInstance.get(`/reference/neighborGene?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<Gene[]>;
    }
  }

  /**
   * Get variant information
   */
  async getVariants(params: GetVariantsParams): Promise<GTExApiResponse<Variant[]>> {
    try {
      const queryParams = this.buildQueryParams({
        snpId: params.snpId,
        variantId: params.variantId,
        datasetId: params.datasetId || 'gtex_v8',
        chromosome: params.chromosome,
        pos: params.pos,
        page: params.page || 0,
        itemsPerPage: params.itemsPerPage || 250
      });
      const response = await this.axiosInstance.get(`/dataset/variant?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<Variant[]>;
    }
  }

  // ===== EXPRESSION DATA =====
  
  /**
   * Get gene expression data
   */
  async getGeneExpression(params: GetGeneExpressionParams): Promise<GTExApiResponse<GeneExpression[]>> {
    try {
      const queryParams = this.buildQueryParams({
        gencodeId: params.gencodeId,
        datasetId: params.datasetId || 'gtex_v8',
        tissueSiteDetailId: params.tissueSiteDetailId,
        attributeSubset: params.attributeSubset,
        page: params.page || 0,
        itemsPerPage: params.itemsPerPage || 250
      });
      const response = await this.axiosInstance.get(`/expression/geneExpression?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<GeneExpression[]>;
    }
  }

  /**
   * Get median gene expression
   */
  async getMedianGeneExpression(
    gencodeIds: string[],
    datasetId: string = 'gtex_v8',
    tissueSiteDetailIds?: string[]
  ): Promise<GTExApiResponse<MedianGeneExpression[]>> {
    try {
      const queryParams = this.buildQueryParams({
        gencodeId: gencodeIds,
        datasetId,
        tissueSiteDetailId: tissueSiteDetailIds,
        page: 0,
        itemsPerPage: 1000
      });
      const response = await this.axiosInstance.get(`/expression/medianGeneExpression?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<MedianGeneExpression[]>;
    }
  }

  /**
   * Get median transcript expression
   */
  async getMedianTranscriptExpression(
    gencodeIds: string[],
    datasetId: string = 'gtex_v8',
    tissueSiteDetailIds?: string[]
  ): Promise<GTExApiResponse<MedianTranscriptExpression[]>> {
    try {
      const queryParams = this.buildQueryParams({
        gencodeId: gencodeIds,
        datasetId,
        tissueSiteDetailId: tissueSiteDetailIds,
        page: 0,
        itemsPerPage: 1000
      });
      const response = await this.axiosInstance.get(`/expression/medianTranscriptExpression?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<MedianTranscriptExpression[]>;
    }
  }

  /**
   * Get top expressed genes in a tissue
   */
  async getTopExpressedGenes(
    tissueSiteDetailId: string,
    datasetId: string = 'gtex_v8',
    filterMtGene: boolean = true,
    limit: number = 100
  ): Promise<GTExApiResponse<TopExpressedGene[]>> {
    try {
      const queryParams = this.buildQueryParams({
        tissueSiteDetailId,
        datasetId,
        filterMtGene,
        page: 0,
        itemsPerPage: limit
      });
      const response = await this.axiosInstance.get(`/expression/topExpressedGene?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<TopExpressedGene[]>;
    }
  }

  /**
   * Get expression PCA data
   */
  async getExpressionPCA(
    tissueSiteDetailIds: string[],
    datasetId: string = 'gtex_v8'
  ): Promise<GTExApiResponse<ExpressionPCA[]>> {
    try {
      const queryParams = this.buildQueryParams({
        tissueSiteDetailId: tissueSiteDetailIds,
        datasetId,
        page: 0,
        itemsPerPage: 1000
      });
      const response = await this.axiosInstance.get(`/expression/expressionPca?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<ExpressionPCA[]>;
    }
  }

  /**
   * Get single nucleus gene expression
   */
  async getSingleNucleusExpression(
    gencodeIds: string[],
    datasetId: string = 'gtex_snrnaseq_pilot',
    tissueSiteDetailIds?: string[],
    excludeDataArray: boolean = true
  ): Promise<GTExApiResponse<SingleNucleusGeneExpression[]>> {
    try {
      const queryParams = this.buildQueryParams({
        gencodeId: gencodeIds,
        datasetId,
        tissueSiteDetailId: tissueSiteDetailIds,
        excludeDataArray,
        page: 0,
        itemsPerPage: 250
      });
      const response = await this.axiosInstance.get(`/expression/singleNucleusGeneExpression?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<SingleNucleusGeneExpression[]>;
    }
  }

  /**
   * Get single nucleus expression summary
   */
  async getSingleNucleusSummary(
    datasetId: string = 'gtex_snrnaseq_pilot',
    tissueSiteDetailIds?: string[]
  ): Promise<GTExApiResponse<SingleNucleusSummary[]>> {
    try {
      const queryParams = this.buildQueryParams({
        datasetId,
        tissueSiteDetailId: tissueSiteDetailIds,
        page: 0,
        itemsPerPage: 250
      });
      const response = await this.axiosInstance.get(`/expression/singleNucleusGeneExpressionSummary?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<SingleNucleusSummary[]>;
    }
  }

  // ===== ASSOCIATION DATA (eQTL/sQTL) =====
  
  /**
   * Get eQTL genes
   */
  async getEQTLGenes(params: GetEQTLGenesParams): Promise<GTExApiResponse<EQTLGene[]>> {
    try {
      const queryParams = this.buildQueryParams({
        tissueSiteDetailId: params.tissueSiteDetailId,
        datasetId: params.datasetId || 'gtex_v8',
        page: params.page || 0,
        itemsPerPage: params.itemsPerPage || 250
      });
      const response = await this.axiosInstance.get(`/association/egene?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<EQTLGene[]>;
    }
  }

  /**
   * Get single tissue eQTLs
   */
  async getSingleTissueEQTLs(params: GetSingleTissueEQTLsParams): Promise<GTExApiResponse<SingleTissueEQTL[]>> {
    try {
      const queryParams = this.buildQueryParams({
        gencodeId: params.gencodeId,
        variantId: params.variantId,
        tissueSiteDetailId: params.tissueSiteDetailId,
        datasetId: params.datasetId || 'gtex_v8',
        page: params.page || 0,
        itemsPerPage: params.itemsPerPage || 250
      });
      const response = await this.axiosInstance.get(`/association/singleTissueEqtl?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<SingleTissueEQTL[]>;
    }
  }

  /**
   * Get multi-tissue eQTL data
   */
  async getMultiTissueEQTLs(
    gencodeId: string,
    variantId?: string,
    datasetId: string = 'gtex_v8'
  ): Promise<GTExApiResponse<MultiTissueEQTL[]>> {
    try {
      const queryParams = this.buildQueryParams({
        gencodeId,
        variantId,
        datasetId,
        page: 0,
        itemsPerPage: 250
      });
      const response = await this.axiosInstance.get(`/association/metasoft?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<MultiTissueEQTL[]>;
    }
  }

  /**
   * Calculate dynamic eQTL
   */
  async calculateDynamicEQTL(params: CalculateDynamicEQTLParams): Promise<GTExApiResponse<DynamicEQTLResult>> {
    try {
      const queryParams = this.buildQueryParams({
        tissueSiteDetailId: params.tissueSiteDetailId,
        gencodeId: params.gencodeId,
        variantId: params.variantId,
        datasetId: params.datasetId || 'gtex_v8'
      });
      const response = await this.axiosInstance.get(`/association/dyneqtl?${queryParams}`);
      return { data: response.data };
    } catch (error) {
      return error as GTExApiResponse<DynamicEQTLResult>;
    }
  }

  /**
   * Get sQTL genes
   */
  async getSQTLGenes(
    tissueSiteDetailIds?: string[],
    datasetId: string = 'gtex_v8'
  ): Promise<GTExApiResponse<SQTLGene[]>> {
    try {
      const queryParams = this.buildQueryParams({
        tissueSiteDetailId: tissueSiteDetailIds,
        datasetId,
        page: 0,
        itemsPerPage: 250
      });
      const response = await this.axiosInstance.get(`/association/sgene?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<SQTLGene[]>;
    }
  }

  /**
   * Get fine mapping data
   */
  async getFineMapping(
    gencodeIds: string[],
    datasetId: string = 'gtex_v8',
    variantId?: string,
    tissueSiteDetailIds?: string[]
  ): Promise<GTExApiResponse<FineMapping[]>> {
    try {
      const queryParams = this.buildQueryParams({
        gencodeId: gencodeIds,
        datasetId,
        variantId,
        tissueSiteDetailId: tissueSiteDetailIds,
        page: 0,
        itemsPerPage: 250
      });
      const response = await this.axiosInstance.get(`/association/fineMapping?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<FineMapping[]>;
    }
  }

  // ===== TISSUE AND SAMPLE DATA =====
  
  /**
   * Get tissue site details
   */
  async getTissueSiteDetails(datasetId: string = 'gtex_v8'): Promise<GTExApiResponse<TissueSiteDetail[]>> {
    try {
      const queryParams = this.buildQueryParams({
        datasetId,
        page: 0,
        itemsPerPage: 100
      });
      const response = await this.axiosInstance.get(`/dataset/tissueSiteDetail?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<TissueSiteDetail[]>;
    }
  }

  /**
   * Get sample information
   */
  async getSamples(params: GetSamplesParams): Promise<GTExApiResponse<Sample[]>> {
    try {
      const queryParams = this.buildQueryParams({
        datasetId: params.datasetId || 'gtex_v8',
        sampleId: params.sampleId,
        tissueSampleId: params.tissueSampleId,
        subjectId: params.subjectId,
        ageBracket: params.ageBracket,
        sex: params.sex,
        pathCategory: params.pathCategory,
        tissueSiteDetailId: params.tissueSiteDetailId,
        page: params.page || 0,
        itemsPerPage: params.itemsPerPage || 250
      });
      const response = await this.axiosInstance.get(`/dataset/sample?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<Sample[]>;
    }
  }

  /**
   * Get subject information
   */
  async getSubjects(
    datasetId: string = 'gtex_v8',
    sex?: string,
    ageBrackets?: string[],
    hardyScale?: string,
    subjectIds?: string[]
  ): Promise<GTExApiResponse<Subject[]>> {
    try {
      const queryParams = this.buildQueryParams({
        datasetId,
        sex,
        ageBracket: ageBrackets,
        hardyScale,
        subjectId: subjectIds,
        page: 0,
        itemsPerPage: 250
      });
      const response = await this.axiosInstance.get(`/dataset/subject?${queryParams}`);
      return { 
        data: response.data.data,
        paging_info: response.data.paging_info
      };
    } catch (error) {
      return error as GTExApiResponse<Subject[]>;
    }
  }

  /**
   * Get biobank sample information
   */
  async getBiobankSamples(
    materialTypes?: string[],
    tissueSiteDetailIds?: string[],
    pathCategories?: string[],
    sex?: string,
    ageBrackets?: string[]
  ): Promise<GTExApiResponse<BiobankSample[]>> {
    try {
      const queryParams = this.buildQueryParams({
        materialType: materialTypes,
        tissueSiteDetailId: tissueSiteDetailIds,
        pathCategory: pathCategories,
        sex,
        ageBracket: ageBrackets,
        page: 0,
        itemsPerPage: 250
      });
      const response = await this.axiosInstance.get(`/biobank/sample?${queryParams}`);
      return { data: response.data.sample };
    } catch (error) {
      return error as GTExApiResponse<BiobankSample[]>;
    }
  }
}
