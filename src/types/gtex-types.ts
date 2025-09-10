/**
 * GTEx Portal API Type Definitions
 * Based on GTEx Portal API v2 documentation
 */

// Base API response structure
export interface GTExApiResponse<T> {
  data?: T;
  paging_info?: PagingInfo;
  error?: string;
  status?: number;
}

export interface PagingInfo {
  numberOfPages: number;
  page: number;
  maxItemsPerPage: number;
  totalNumberOfItems: number;
}

// Dataset and Service Info
export interface ServiceInfo {
  id: string;
  name: string;
  version: string;
  organization: {
    name: string;
    url: string;
  };
  description: string;
  contactUrl: string;
  documentationUrl: string;
  environment: string;
}

export interface DatasetInfo {
  datasetId: string;
  dbSnpBuild: number;
  dbgapId: string;
  description: string;
  displayName: string;
  eqtlSubjectCount: number;
  eqtlTissuesCount: number;
  gencodeVersion: string;
  genomeBuild: string;
  organization: string;
  rnaSeqAndGenotypeSampleCount: number;
  rnaSeqSampleCount: number;
  subjectCount: number;
  tissueCount: number;
}

// Gene and Reference Data
export interface Gene {
  chromosome: string;
  dataSource: string;
  description: string;
  end: number;
  entrezGeneId: number;
  gencodeId: string;
  gencodeVersion: string;
  geneStatus: string;
  geneSymbol: string;
  geneSymbolUpper: string;
  geneType: string;
  genomeBuild: string;
  start: number;
  strand: string;
  tss: number;
}

export interface Variant {
  snpId: string;
  b37VariantId: string;
  pos: number;
  maf01: boolean;
  variantId: string;
  alt: string;
  chromosome: string;
  snpIdUpper: string;
  datasetId: string;
  ref: string;
  shorthand: string;
}

export interface Transcript {
  start: number;
  end: number;
  featureType: string;
  genomeBuild: string;
  transcriptId: string;
  source: string;
  chromosome: string;
  gencodeId: string;
  geneSymbol: string;
  gencodeVersion: string;
  strand: string;
}

// Expression Data
export interface GeneExpression {
  data: number[];
  tissueSiteDetailId: string;
  ontologyId: string;
  datasetId: string;
  gencodeId: string;
  geneSymbol: string;
  unit: string;
  subsetGroup?: string;
}

export interface MedianGeneExpression {
  median: number;
  tissueSiteDetailId: string;
  ontologyId: string;
  datasetId: string;
  gencodeId: string;
  geneSymbol: string;
  unit: string;
}

export interface MedianTranscriptExpression {
  median: number;
  transcriptId: string;
  tissueSiteDetailId: string;
  ontologyId: string;
  datasetId: string;
  gencodeId: string;
  geneSymbol: string;
  unit: string;
}

export interface TopExpressedGene {
  tissueSiteDetailId: string;
  ontologyId: string;
  datasetId: string;
  gencodeId: string;
  geneSymbol: string;
  median: number;
  unit: string;
}

export interface ExpressionPCA {
  pc1: number;
  pc2: number;
  pc3: number;
  sampleId: string;
  tissueSiteDetailId: string;
  ontologyId: string;
  datasetId: string;
}

export interface SingleNucleusCellType {
  cellType: string;
  count: number;
  meanWithZeros: number;
  meanWithoutZeros: number;
  medianWithZeros: number;
  medianWithoutZeros: number;
  numZeros: number;
  data?: number[];
}

export interface SingleNucleusGeneExpression {
  tissueSiteDetailId: string;
  ontologyId: string;
  datasetId: string;
  gencodeId: string;
  geneSymbol: string;
  cellTypes: SingleNucleusCellType[];
  unit: string;
}

export interface SingleNucleusSummary {
  tissueSiteDetailId: string;
  ontologyId: string;
  datasetId: string;
  cellType: string;
  numCells: number;
}

// Association Data (eQTL/sQTL)
export interface EQTLGene {
  tissueSiteDetailId: string;
  ontologyId: string;
  datasetId: string;
  empiricalPValue: number;
  gencodeId: string;
  geneSymbol: string;
  log2AllelicFoldChange: number;
  pValue: number;
  pValueThreshold: number;
  qValue: number;
}

export interface SingleTissueEQTL {
  snpId: string;
  pos: number;
  snpIdUpper: string;
  variantId: string;
  geneSymbol: string;
  pValue: number;
  geneSymbolUpper: string;
  datasetId: string;
  tissueSiteDetailId: string;
  ontologyId: string;
  chromosome: string;
  gencodeId: string;
  nes: number;
}

export interface MultiTissueEQTL {
  gencodeId: string;
  datasetId: string;
  metaP: number;
  variantId: string;
  tissues: {
    [tissueName: string]: {
      mValue: number;
      pValue: number;
      se: number;
      nes: number;
    };
  };
}

export interface DynamicEQTLResult {
  data: number[];
  error: number;
  gencodeId: string;
  geneSymbol: string;
  genotypes: number[];
  hetCount: number;
  homoAltCount: number;
  homoRefCount: number;
  maf: number;
  nes: number;
  pValue: number;
  pValueThreshold: number;
  tStatistic: number;
  tissueSiteDetailId: string;
  variantId: string;
}

export interface SQTLGene {
  nPhenotypes: number;
  pValueThreshold: number;
  phenotypeId: string;
  geneSymbol: string;
  pValue: number;
  datasetId: string;
  empiricalPValue: number;
  tissueSiteDetailId: string;
  ontologyId: string;
  qValue: number;
  gencodeId: string;
}

export interface FineMapping {
  datasetId: string;
  gencodeId: string;
  method: string;
  pip: number;
  setId: number;
  setSize: number;
  tissueSiteDetailId: string;
  ontologyId: string;
  variantId: string;
}

// Tissue and Sample Data
export interface TissueSiteDetail {
  tissueSiteDetailId: string;
  colorHex: string;
  colorRgb: string;
  datasetId: string;
  eGeneCount: number;
  expressedGeneCount: number;
  hasEGenes: boolean;
  hasSGenes: boolean;
  mappedInHubmap: boolean;
  eqtlSampleSummary: {
    totalCount: number;
    female: {
      ageMax: number;
      ageMin: number;
      ageMean: number;
      count: number;
    };
    male: {
      ageMax: number;
      ageMin: number;
      ageMean: number;
      count: number;
    };
  };
  rnaSeqSampleSummary: {
    totalCount: number;
    female: {
      ageMax: number;
      ageMin: number;
      ageMean: number;
      count: number;
    };
    male: {
      ageMax: number;
      ageMin: number;
      ageMean: number;
      count: number;
    };
  };
  sGeneCount: number;
  samplingSite: string;
  tissueSite: string;
  tissueSiteDetail: string;
  tissueSiteDetailAbbr: string;
  ontologyId: string;
  ontologyIri: string;
}

export interface Sample {
  ischemicTime: number;
  aliquotId: string;
  tissueSampleId: string;
  tissueSiteDetail: string;
  dataType: string;
  ischemicTimeGroup: string;
  pathologyNotesCategories: { [key: string]: boolean };
  freezeType: string;
  pathologyNotes: string;
  sampleId: string;
  sampleIdUpper: string;
  ageBracket: string;
  rin: number;
  hardyScale: string;
  tissueSiteDetailId: string;
  subjectId: string;
  uberonId: string;
  sex: string;
  autolysisScore: string;
  datasetId: string;
}

export interface Subject {
  hardyScale: string;
  ageBracket: string;
  subjectId: string;
  sex: string;
  datasetId: string;
}

export interface BiobankSample {
  materialType: string;
  sampleId: string;
  sampleIdUpper: string;
  sex: string;
  rin: number;
  hasGTExImage: boolean;
  concentration: number;
  autolysisScore: string;
  analysisRelease: string;
  genotype: string;
  hardyScale: string;
  pathologyNotes: string;
  subjectId: string;
  tissueSiteDetailId: string;
  hasGenotype: boolean;
  originalMaterialType: string;
  aliquotId: string;
  tissueSampleId: string;
  ageBracket: string;
  brainTissueDonor: boolean;
  volume: number;
  hasExpressionData: boolean;
  hasBRDImage: boolean;
  tissueSiteDetail: string;
  pathologyNotesCategories: { [key: string]: boolean };
  amount: number;
  mass: number;
  tissueSite: string;
  expression: string;
}

// API Request Parameters
export interface SearchGenesParams {
  geneId: string;
  gencodeVersion?: string;
  genomeBuild?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface GetGeneExpressionParams {
  gencodeId: string[];
  datasetId?: string;
  tissueSiteDetailId?: string[];
  attributeSubset?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface GetEQTLGenesParams {
  tissueSiteDetailId?: string[];
  datasetId?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface GetSingleTissueEQTLsParams {
  gencodeId?: string[];
  variantId?: string[];
  tissueSiteDetailId?: string[];
  datasetId?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface CalculateDynamicEQTLParams {
  tissueSiteDetailId: string;
  gencodeId: string;
  variantId: string;
  datasetId?: string;
}

export interface GetVariantsParams {
  snpId?: string;
  variantId?: string;
  datasetId?: string;
  chromosome?: string;
  pos?: number[];
  page?: number;
  itemsPerPage?: number;
}

export interface GetSamplesParams {
  datasetId?: string;
  sampleId?: string[];
  tissueSampleId?: string[];
  subjectId?: string[];
  ageBracket?: string[];
  sex?: string;
  pathCategory?: string[];
  tissueSiteDetailId?: string[];
  page?: number;
  itemsPerPage?: number;
}

// Enums and Constants
export type DatasetId = 'gtex_v8' | 'gtex_snrnaseq_pilot' | 'gtex_v10';
export type GencodeVersion = 'v39' | 'v26' | 'v19';
export type GenomeBuild = 'GRCh38/hg38' | 'GRCh37/hg19';
export type Chromosome = 'chr1' | 'chr2' | 'chr3' | 'chr4' | 'chr5' | 'chr6' | 'chr7' | 'chr8' | 'chr9' | 'chr10' | 'chr11' | 'chr12' | 'chr13' | 'chr14' | 'chr15' | 'chr16' | 'chr17' | 'chr18' | 'chr19' | 'chr20' | 'chr21' | 'chr22' | 'chrX' | 'chrY' | 'chrM';

export const GTEX_DATASETS: DatasetId[] = ['gtex_v8', 'gtex_snrnaseq_pilot', 'gtex_v10'];
export const GTEX_TISSUES = [
  'Adipose_Subcutaneous', 'Adipose_Visceral_Omentum', 'Adrenal_Gland',
  'Artery_Aorta', 'Artery_Coronary', 'Artery_Tibial', 'Bladder',
  'Brain_Amygdala', 'Brain_Anterior_cingulate_cortex_BA24', 'Brain_Caudate_basal_ganglia',
  'Brain_Cerebellar_Hemisphere', 'Brain_Cerebellum', 'Brain_Cortex',
  'Brain_Frontal_Cortex_BA9', 'Brain_Hippocampus', 'Brain_Hypothalamus',
  'Brain_Nucleus_accumbens_basal_ganglia', 'Brain_Putamen_basal_ganglia',
  'Brain_Spinal_cord_cervical_c-1', 'Brain_Substantia_nigra',
  'Breast_Mammary_Tissue', 'Cells_Cultured_fibroblasts',
  'Cells_EBV-transformed_lymphocytes', 'Cells_Transformed_fibroblasts',
  'Cervix_Ectocervix', 'Cervix_Endocervix', 'Colon_Sigmoid',
  'Colon_Transverse', 'Esophagus_Gastroesophageal_Junction',
  'Esophagus_Mucosa', 'Esophagus_Muscularis', 'Fallopian_Tube',
  'Heart_Atrial_Appendage', 'Heart_Left_Ventricle', 'Kidney_Cortex',
  'Kidney_Medulla', 'Liver', 'Lung', 'Minor_Salivary_Gland',
  'Muscle_Skeletal', 'Nerve_Tibial', 'Ovary', 'Pancreas',
  'Pituitary', 'Prostate', 'Skin_Not_Sun_Exposed_Suprapubic',
  'Skin_Sun_Exposed_Lower_leg', 'Small_Intestine_Terminal_Ileum',
  'Spleen', 'Stomach', 'Testis', 'Thyroid', 'Uterus', 'Vagina', 'Whole_Blood'
];
