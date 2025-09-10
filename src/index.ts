#!/usr/bin/env node

/**
 * GTEx Portal MCP Server
 * 
 * Provides comprehensive access to GTEx (Genotype-Tissue Expression) genomics data
 * through 25 specialized tools across three categories:
 * - Expression Analysis: Gene expression patterns and tissue specificity
 * - Association Analysis: eQTL/sQTL analysis and genetic associations
 * - Reference/Dataset: Gene/variant lookups and metadata
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import our handler classes
import { ExpressionHandlers } from "./handlers/expression-handlers.js";
import { AssociationHandlers } from "./handlers/association-handlers.js";
import { ReferenceHandlers } from "./handlers/reference-handlers.js";
import { GTExApiClient } from "./utils/api-client.js";

/**
 * Create an MCP server for GTEx Portal API access
 */
const server = new Server(
  {
    name: "gtex-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize handlers (they create their own API clients internally)
const expressionHandlers = new ExpressionHandlers();
const associationHandlers = new AssociationHandlers();
const referenceHandlers = new ReferenceHandlers();

/**
 * Handler that lists all available GTEx tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Expression Analysis Tools (7 tools)
      {
        name: "get_gene_expression",
        description: "Get gene expression data across tissues for a specific gene",
        inputSchema: {
          type: "object",
          properties: {
            gencodeId: {
              type: "string",
              description: "GENCODE gene ID (e.g., ENSG00000223972.5)"
            },
            datasetId: {
              type: "string", 
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          },
          required: ["gencodeId"]
        }
      },
      {
        name: "get_median_gene_expression",
        description: "Get median gene expression levels across tissues",
        inputSchema: {
          type: "object",
          properties: {
            gencodeId: {
              type: "string",
              description: "GENCODE gene ID (e.g., ENSG00000223972.5)"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          },
          required: ["gencodeId"]
        }
      },
      {
        name: "get_top_expressed_genes",
        description: "Get top expressed genes in a specific tissue",
        inputSchema: {
          type: "object",
          properties: {
            tissueSiteDetailId: {
              type: "string", 
              description: "Tissue site detail ID (e.g., Muscle_Skeletal, Brain_Cortex)"
            },
            filterMtGenes: {
              type: "boolean",
              description: "Filter out mitochondrial genes (default: true)",
              default: true
            },
            sortBy: {
              type: "string",
              description: "Sort criteria (default: median)",
              enum: ["median", "mean"],
              default: "median"
            },
            sortDirection: {
              type: "string",
              description: "Sort direction (default: desc)",
              enum: ["asc", "desc"], 
              default: "desc"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          },
          required: ["tissueSiteDetailId"]
        }
      },
      {
        name: "get_tissue_specific_genes",
        description: "Get genes with tissue-specific expression patterns",
        inputSchema: {
          type: "object",
          properties: {
            tissueSiteDetailId: {
              type: "string",
              description: "Tissue site detail ID (e.g., Muscle_Skeletal, Brain_Cortex)"
            },
            selectionCriteria: {
              type: "string",
              description: "Selection criteria for tissue specificity (default: highestInGroup)",
              enum: ["highestInGroup", "aboveThreshold"],
              default: "highestInGroup"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)", 
              default: "gtex_v8"
            }
          },
          required: ["tissueSiteDetailId"]
        }
      },
      {
        name: "get_clustered_expression",
        description: "Get clustered gene expression data for visualization",
        inputSchema: {
          type: "object",
          properties: {
            gencodeIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of GENCODE gene IDs"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          },
          required: ["gencodeIds"]
        }
      },
      {
        name: "calculate_expression_correlation",
        description: "Calculate expression correlation between genes across tissues",
        inputSchema: {
          type: "object",
          properties: {
            gencodeIds: {
              type: "array", 
              items: { type: "string" },
              description: "Array of GENCODE gene IDs to compare"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          },
          required: ["gencodeIds"]
        }
      },
      {
        name: "get_differential_expression",
        description: "Get differential gene expression between tissue groups",
        inputSchema: {
          type: "object",
          properties: {
            gencodeId: {
              type: "string",
              description: "GENCODE gene ID (e.g., ENSG00000223972.5)"
            },
            comparisonGroups: {
              type: "array",
              items: { type: "string" },
              description: "Array of tissue groups to compare"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8" 
            }
          },
          required: ["gencodeId", "comparisonGroups"]
        }
      },

      // Association Analysis Tools (6 tools)  
      {
        name: "get_eqtl_genes",
        description: "Get genes with eQTL associations for a genomic region",
        inputSchema: {
          type: "object",
          properties: {
            chr: {
              type: "string",
              description: "Chromosome (e.g., chr1, chr2, chrX)"
            },
            start: {
              type: "integer",
              description: "Start position (1-based)"
            },
            end: {
              type: "integer", 
              description: "End position (1-based)"
            },
            tissueSiteDetailId: {
              type: "string",
              description: "Tissue site detail ID (optional, for tissue-specific results)"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          },
          required: ["chr", "start", "end"]
        }
      },
      {
        name: "get_single_tissue_eqtls", 
        description: "Get single-tissue eQTL results for a gene",
        inputSchema: {
          type: "object",
          properties: {
            gencodeId: {
              type: "string",
              description: "GENCODE gene ID (e.g., ENSG00000223972.5)"
            },
            tissueSiteDetailId: {
              type: "string",
              description: "Tissue site detail ID (e.g., Muscle_Skeletal, Brain_Cortex)"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          },
          required: ["gencodeId", "tissueSiteDetailId"]
        }
      },
      {
        name: "calculate_dynamic_eqtl",
        description: "Calculate dynamic eQTL effects across tissues",
        inputSchema: {
          type: "object",
          properties: {
            gencodeId: {
              type: "string", 
              description: "GENCODE gene ID (e.g., ENSG00000223972.5)"
            },
            snpId: {
              type: "string",
              description: "SNP ID (rs number or variant ID)"
            },
            tissueSiteDetailIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of tissue site detail IDs to compare"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          },
          required: ["gencodeId", "snpId", "tissueSiteDetailIds"]
        }
      },
      {
        name: "get_multi_tissue_eqtls",
        description: "Get multi-tissue eQTL meta-analysis results", 
        inputSchema: {
          type: "object",
          properties: {
            gencodeId: {
              type: "string",
              description: "GENCODE gene ID (e.g., ENSG00000223972.5)"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          },
          required: ["gencodeId"]
        }
      },
      {
        name: "get_sqtl_results",
        description: "Get splicing QTL (sQTL) results for a gene",
        inputSchema: {
          type: "object",
          properties: {
            gencodeId: {
              type: "string",
              description: "GENCODE gene ID (e.g., ENSG00000223972.5)"
            },
            tissueSiteDetailId: {
              type: "string",
              description: "Tissue site detail ID (optional, for tissue-specific results)"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          },
          required: ["gencodeId"]
        }
      },
      {
        name: "analyze_ld_structure",
        description: "Analyze linkage disequilibrium structure around eQTL variants",
        inputSchema: {
          type: "object",
          properties: {
            chr: {
              type: "string",
              description: "Chromosome (e.g., chr1, chr2, chrX)"
            },
            position: {
              type: "integer",
              description: "Genomic position (1-based)"
            },
            windowSize: {
              type: "integer",
              description: "Window size around position (default: 100000)",
              default: 100000
            },
            population: {
              type: "string",
              description: "Population for LD analysis (default: EUR)", 
              enum: ["EUR", "AFR", "AMR", "EAS", "SAS"],
              default: "EUR"
            }
          },
          required: ["chr", "position"]
        }
      },

      // Reference/Dataset Tools (12 tools)
      {
        name: "search_genes",
        description: "Search for genes by symbol, name, or description",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (gene symbol, name, or description)"
            },
            species: {
              type: "string", 
              description: "Species (default: human)",
              enum: ["human", "mouse"],
              default: "human"
            },
            page: {
              type: "integer",
              description: "Page number for pagination (default: 0)",
              default: 0
            },
            pageSize: {
              type: "integer",
              description: "Number of results per page (default: 250)",
              default: 250
            }
          },
          required: ["query"]
        }
      },
      {
        name: "get_gene_info",
        description: "Get detailed information about a specific gene",
        inputSchema: {
          type: "object",
          properties: {
            gencodeId: {
              type: "string",
              description: "GENCODE gene ID (e.g., ENSG00000223972.5)"
            },
            geneSymbol: {
              type: "string",
              description: "Gene symbol (alternative to gencodeId)"
            }
          }
        }
      },
      {
        name: "get_variants",
        description: "Get genetic variants in a genomic region",
        inputSchema: {
          type: "object",
          properties: {
            chr: {
              type: "string",
              description: "Chromosome (e.g., chr1, chr2, chrX)"
            },
            start: {
              type: "integer",
              description: "Start position (1-based)"
            },
            end: {
              type: "integer",
              description: "End position (1-based)"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          },
          required: ["chr", "start", "end"]
        }
      },
      {
        name: "get_tissue_info",
        description: "Get information about GTEx tissues and sample counts",
        inputSchema: {
          type: "object",
          properties: {
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          }
        }
      },
      {
        name: "get_sample_info",
        description: "Get GTEx sample metadata and demographics",
        inputSchema: {
          type: "object",
          properties: {
            tissueSiteDetailId: {
              type: "string",
              description: "Tissue site detail ID (optional, for tissue-specific samples)"
            },
            datasetId: {
              type: "string", 
              description: "GTEx dataset ID (default: gtex_v8)",
              default: "gtex_v8"
            }
          }
        }
      },
      {
        name: "get_subject_phenotypes",
        description: "Get subject phenotype data and demographics",
        inputSchema: {
          type: "object",
          properties: {
            subjectId: {
              type: "string",
              description: "GTEx subject ID (optional, for specific subject)"
            },
            datasetId: {
              type: "string",
              description: "GTEx dataset ID (default: gtex_v8)", 
              default: "gtex_v8"
            }
          }
        }
      },
      {
        name: "validate_gene_id",
        description: "Validate and normalize gene identifiers",
        inputSchema: {
          type: "object",
          properties: {
            geneId: {
              type: "string",
              description: "Gene ID to validate (GENCODE ID or gene symbol)"
            }
          },
          required: ["geneId"]
        }
      },
      {
        name: "validate_variant_id", 
        description: "Validate variant identifiers and genomic coordinates",
        inputSchema: {
          type: "object",
          properties: {
            variantId: {
              type: "string",
              description: "Variant ID to validate (rs number or variant ID)"
            },
            chr: {
              type: "string",
              description: "Chromosome (alternative validation method)"
            },
            position: {
              type: "integer",
              description: "Genomic position (alternative validation method)"
            }
          }
        }
      },
      {
        name: "get_dataset_info",
        description: "Get information about available GTEx datasets",
        inputSchema: {
          type: "object",
          properties: {
            datasetId: {
              type: "string",
              description: "Specific dataset ID (optional, returns all if not provided)"
            }
          }
        }
      },
      {
        name: "search_transcripts",
        description: "Search for gene transcripts and isoforms",
        inputSchema: {
          type: "object",
          properties: {
            gencodeId: {
              type: "string",
              description: "GENCODE gene ID (e.g., ENSG00000223972.5)"
            },
            transcriptType: {
              type: "string",
              description: "Transcript type filter (optional)",
              enum: ["protein_coding", "lncRNA", "pseudogene", "miRNA"]
            }
          },
          required: ["gencodeId"]
        }
      },
      {
        name: "get_gene_ontology",
        description: "Get Gene Ontology annotations for a gene",
        inputSchema: {
          type: "object",
          properties: {
            gencodeId: {
              type: "string",
              description: "GENCODE gene ID (e.g., ENSG00000223972.5)"
            },
            ontologyType: {
              type: "string", 
              description: "GO ontology type (optional)",
              enum: ["biological_process", "cellular_component", "molecular_function"]
            }
          },
          required: ["gencodeId"]
        }
      },
      {
        name: "convert_coordinates",
        description: "Convert between different genomic coordinate systems",
        inputSchema: {
          type: "object",
          properties: {
            chr: {
              type: "string",
              description: "Chromosome (e.g., chr1, chr2, chrX)"
            },
            position: {
              type: "integer",
              description: "Genomic position to convert"
            },
            fromBuild: {
              type: "string",
              description: "Source genome build (default: hg38)",
              enum: ["hg19", "hg38"],
              default: "hg38"
            },
            toBuild: {
              type: "string", 
              description: "Target genome build (default: hg19)",
              enum: ["hg19", "hg38"],
              default: "hg19"
            }
          },
          required: ["chr", "position"]
        }
      }
    ]
  };
});

/**
 * Handler for tool calls - routes to appropriate handler based on tool name
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Expression Analysis Tools
    if (name === "get_gene_expression") {
      return await expressionHandlers.getGeneExpression({
        geneIds: args?.gencodeId ? [args.gencodeId] : [],
        datasetId: args?.datasetId
      });
    }
    if (name === "get_median_gene_expression") {
      return await expressionHandlers.getMedianGeneExpression({
        geneIds: args?.gencodeId ? [args.gencodeId] : [],
        datasetId: args?.datasetId
      });
    }
    if (name === "get_top_expressed_genes") {
      return await expressionHandlers.getTopExpressedGenes({
        tissueId: args?.tissueSiteDetailId,
        filterMtGene: args?.filterMtGenes,
        datasetId: args?.datasetId
      });
    }
    if (name === "get_tissue_specific_genes") {
      return await expressionHandlers.getTissueSpecificGenes({
        tissueId: args?.tissueSiteDetailId,
        selectionCriteria: args?.selectionCriteria,
        datasetId: args?.datasetId
      });
    }
    if (name === "get_clustered_expression") {
      return await expressionHandlers.getClusteredExpression({
        gencodeIds: args?.gencodeIds || [],
        datasetId: args?.datasetId
      });
    }
    if (name === "calculate_expression_correlation") {
      return await expressionHandlers.calculateExpressionCorrelation({
        geneIds: args?.gencodeIds || [],
        datasetId: args?.datasetId
      });
    }
    if (name === "get_differential_expression") {
      return await expressionHandlers.getDifferentialExpression({
        gencodeId: args?.gencodeId,
        comparisonGroups: args?.comparisonGroups || [],
        datasetId: args?.datasetId
      });
    }

    // Association Analysis Tools
    if (name === "get_eqtl_genes") {
      return await associationHandlers.getEQTLGenes({
        tissueIds: args?.tissueSiteDetailId ? [args.tissueSiteDetailId] : undefined,
        datasetId: args?.datasetId
      });
    }
    if (name === "get_single_tissue_eqtls") {
      return await associationHandlers.getSingleTissueEQTLs({
        geneIds: args?.gencodeId ? [args.gencodeId] : undefined,
        tissueIds: args?.tissueSiteDetailId ? [args.tissueSiteDetailId] : undefined,
        datasetId: args?.datasetId
      });
    }
    if (name === "calculate_dynamic_eqtl") {
      return await associationHandlers.calculateDynamicEQTL({
        geneId: args?.gencodeId,
        variantId: args?.snpId,
        tissueId: Array.isArray(args?.tissueSiteDetailIds) && args.tissueSiteDetailIds.length > 0 ? args.tissueSiteDetailIds[0] : undefined,
        datasetId: args?.datasetId
      });
    }
    if (name === "get_multi_tissue_eqtls") {
      return await associationHandlers.getMultiTissueEQTLs({
        geneId: args?.gencodeId,
        datasetId: args?.datasetId
      });
    }
    if (name === "get_sqtl_results") {
      return await associationHandlers.getSQTLGenes({
        tissueIds: args?.tissueSiteDetailId ? [args.tissueSiteDetailId] : undefined,
        datasetId: args?.datasetId
      });
    }
    if (name === "analyze_ld_structure") {
      return await associationHandlers.analyzeLDStructure({
        chr: args?.chr,
        position: args?.position,
        windowSize: args?.windowSize,
        population: args?.population
      });
    }

    // Reference/Dataset Tools
    if (name === "search_genes") {
      return await referenceHandlers.searchGenes({
        query: args?.query,
        page: args?.page,
        itemsPerPage: args?.pageSize
      });
    }
    if (name === "get_gene_info") {
      return await referenceHandlers.getGeneInfo({
        geneIds: args?.gencodeId ? [args.gencodeId] : (args?.geneSymbol ? [args.geneSymbol] : [])
      });
    }
    if (name === "get_variants") {
      return await referenceHandlers.getVariants({
        chromosome: args?.chr,
        positions: args?.start && args?.end ? [args.start, args.end] : undefined,
        datasetId: args?.datasetId
      });
    }
    if (name === "get_tissue_info") {
      return await referenceHandlers.getTissueInfo({
        datasetId: args?.datasetId
      });
    }
    if (name === "get_sample_info") {
      return await referenceHandlers.getSamples({
        tissueIds: args?.tissueSiteDetailId ? [args.tissueSiteDetailId] : undefined,
        datasetId: args?.datasetId
      });
    }
    if (name === "get_subject_phenotypes") {
      return await referenceHandlers.getSubjects({
        subjectIds: args?.subjectId ? [args.subjectId] : undefined,
        datasetId: args?.datasetId
      });
    }
    if (name === "validate_gene_id") {
      return await referenceHandlers.validateIds({
        ids: [args?.geneId],
        type: 'gene'
      });
    }
    if (name === "validate_variant_id") {
      return await referenceHandlers.validateIds({
        ids: [args?.variantId],
        type: 'variant'
      });
    }
    if (name === "get_dataset_info") {
      return await referenceHandlers.getDatasetInfo({
        datasetId: args?.datasetId
      });
    }
    if (name === "search_transcripts") {
      return await referenceHandlers.getTranscripts({
        geneId: args?.gencodeId
      });
    }
    if (name === "get_gene_ontology") {
      return await referenceHandlers.getGeneOntology({
        gencodeId: args?.gencodeId,
        ontologyType: args?.ontologyType
      });
    }
    if (name === "convert_coordinates") {
      return await referenceHandlers.convertCoordinates({
        chr: args?.chr,
        position: args?.position,
        fromBuild: args?.fromBuild,
        toBuild: args?.toBuild
      });
    }

    throw new Error(`Unknown tool: ${name}`);

  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      content: [{
        type: "text",
        text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
});

/**
 * Start the server using stdio transport
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GTEx Portal MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
