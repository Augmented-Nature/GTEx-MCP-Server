/**
 * GTEx Expression Analysis Tool Handlers
 * Implements MCP tools for gene and transcript expression analysis
 */

import { GTExApiClient } from '../utils/api-client.js';
import { GTEX_TISSUES } from '../types/gtex-types.js';

export class ExpressionHandlers {
  private apiClient: GTExApiClient;

  constructor() {
    this.apiClient = new GTExApiClient();
  }

  /**
   * Get gene expression data at the sample level
   */
  async getGeneExpression(args: any) {
    if (!args.geneIds || !Array.isArray(args.geneIds) || args.geneIds.length === 0) {
      throw new Error('geneIds parameter is required and must be a non-empty array of gene IDs (GENCODE IDs or gene symbols)');
    }

    if (args.geneIds.length > 60) {
      return {
        content: [{
          type: "text",
          text: "Maximum 60 genes can be processed at once. Please reduce the number of genes."
        }]
      };
    }

    const result = await this.apiClient.getGeneExpression({
      gencodeId: args.geneIds,
      datasetId: args.datasetId || 'gtex_v8',
      tissueSiteDetailId: args.tissueIds,
      attributeSubset: args.attributeSubset,
      page: args.page || 0,
      itemsPerPage: args.itemsPerPage || 250
    });

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving gene expression data: ${result.error}`
        }],
        isError: true
      };
    }

    const expressions = result.data || [];
    if (expressions.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No gene expression data found for the specified genes and tissues.${args.tissueIds ? ` Check that tissue IDs are valid: ${args.tissueIds.join(', ')}` : ''}`
        }]
      };
    }

    // Group by gene and tissue for better organization
    const geneGroups: { [key: string]: any[] } = {};
    expressions.forEach(expr => {
      const key = `${expr.geneSymbol} (${expr.gencodeId})`;
      if (!geneGroups[key]) {
        geneGroups[key] = [];
      }
      geneGroups[key].push(expr);
    });

    let output = `**Gene Expression Data (${expressions.length} results)**\n`;
    output += `Dataset: ${expressions[0]?.datasetId || args.datasetId}\n`;
    if (args.attributeSubset) {
      output += `Subset by: ${args.attributeSubset}\n`;
    }
    output += '\n';

    Object.entries(geneGroups).forEach(([geneKey, geneExpressions]) => {
      output += `### ${geneKey}\n`;
      
      geneExpressions.forEach(expr => {
        const tissueDisplayName = this.getTissueDisplayName(expr.tissueSiteDetailId);
        output += `**${tissueDisplayName}**${expr.subsetGroup ? ` (${expr.subsetGroup})` : ''}:\n`;
        
        const stats = this.calculateExpressionStats(expr.data);
        output += `  • Samples: ${expr.data.length}\n`;
        output += `  • Mean: ${stats.mean.toFixed(3)} ${expr.unit}\n`;
        output += `  • Median: ${stats.median.toFixed(3)} ${expr.unit}\n`;
        output += `  • Range: ${stats.min.toFixed(3)} - ${stats.max.toFixed(3)} ${expr.unit}\n`;
        output += `  • Non-zero samples: ${stats.nonZeroCount} (${stats.nonZeroPercent.toFixed(1)}%)\n\n`;
      });
    });

    if (result.paging_info && result.paging_info.totalNumberOfItems > expressions.length) {
      output += `**Note:** Showing ${expressions.length} of ${result.paging_info.totalNumberOfItems} total results. `;
      output += `Use page parameter to retrieve additional results.\n`;
    }

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Get median gene expression across tissues
   */
  async getMedianGeneExpression(args: any) {
    if (!args.geneIds || !Array.isArray(args.geneIds) || args.geneIds.length === 0) {
      throw new Error('geneIds parameter is required and must be a non-empty array of gene IDs');
    }

    if (args.geneIds.length > 60) {
      return {
        content: [{
          type: "text",
          text: "Maximum 60 genes can be processed at once. Please reduce the number of genes."
        }]
      };
    }

    const result = await this.apiClient.getMedianGeneExpression(
      args.geneIds,
      args.datasetId || 'gtex_v8',
      args.tissueIds
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving median gene expression: ${result.error}`
        }],
        isError: true
      };
    }

    const expressions = result.data || [];
    if (expressions.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No median expression data found for the specified genes."
        }]
      };
    }

    // Group by gene for better organization
    const geneGroups: { [key: string]: any[] } = {};
    expressions.forEach(expr => {
      const key = `${expr.geneSymbol} (${expr.gencodeId})`;
      if (!geneGroups[key]) {
        geneGroups[key] = [];
      }
      geneGroups[key].push(expr);
    });

    let output = `**Median Gene Expression (${expressions.length} tissue-gene combinations)**\n`;
    output += `Dataset: ${expressions[0]?.datasetId || args.datasetId}\n\n`;

    Object.entries(geneGroups).forEach(([geneKey, geneExpressions]) => {
      output += `### ${geneKey}\n`;
      
      // Sort by expression level (highest first)
      const sortedExpressions = geneExpressions.sort((a, b) => b.median - a.median);
      
      // Show top expressing tissues
      const topCount = Math.min(10, sortedExpressions.length);
      output += `**Top ${topCount} expressing tissues:**\n`;
      sortedExpressions.slice(0, topCount).forEach((expr, index) => {
        const tissueDisplayName = this.getTissueDisplayName(expr.tissueSiteDetailId);
        output += `  ${index + 1}. **${tissueDisplayName}**: ${expr.median.toFixed(3)} ${expr.unit}\n`;
      });

      if (sortedExpressions.length > topCount) {
        output += `  ... and ${sortedExpressions.length - topCount} more tissues\n`;
      }

      // Expression summary
      const medians = sortedExpressions.map(e => e.median);
      const expressionStats = {
        max: Math.max(...medians),
        min: Math.min(...medians),
        mean: medians.reduce((sum, val) => sum + val, 0) / medians.length,
        nonZeroCount: medians.filter(val => val > 0).length
      };

      output += `\n**Expression Summary:**\n`;
      output += `  • Tissues analyzed: ${sortedExpressions.length}\n`;
      output += `  • Highest expression: ${expressionStats.max.toFixed(3)} ${sortedExpressions[0]?.unit || 'TPM'}\n`;
      output += `  • Mean expression: ${expressionStats.mean.toFixed(3)} ${sortedExpressions[0]?.unit || 'TPM'}\n`;
      output += `  • Tissues with detectable expression: ${expressionStats.nonZeroCount}\n\n`;
    });

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Get median transcript expression
   */
  async getMedianTranscriptExpression(args: any) {
    if (!args.geneIds || !Array.isArray(args.geneIds) || args.geneIds.length === 0) {
      throw new Error('geneIds parameter is required and must be a non-empty array of gene IDs');
    }

    const result = await this.apiClient.getMedianTranscriptExpression(
      args.geneIds,
      args.datasetId || 'gtex_v8',
      args.tissueIds
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving median transcript expression: ${result.error}`
        }],
        isError: true
      };
    }

    const expressions = result.data || [];
    if (expressions.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No median transcript expression data found for the specified genes."
        }]
      };
    }

    // Group by gene
    const geneGroups: { [key: string]: any[] } = {};
    expressions.forEach(expr => {
      const key = `${expr.geneSymbol} (${expr.gencodeId})`;
      if (!geneGroups[key]) {
        geneGroups[key] = [];
      }
      geneGroups[key].push(expr);
    });

    let output = `**Median Transcript Expression (${expressions.length} results)**\n`;
    output += `Dataset: ${expressions[0]?.datasetId || args.datasetId}\n\n`;

    Object.entries(geneGroups).forEach(([geneKey, geneExpressions]) => {
      output += `### ${geneKey}\n`;
      
      // Group by tissue within gene
      const tissueGroups: { [key: string]: any[] } = {};
      geneExpressions.forEach(expr => {
        if (!tissueGroups[expr.tissueSiteDetailId]) {
          tissueGroups[expr.tissueSiteDetailId] = [];
        }
        tissueGroups[expr.tissueSiteDetailId].push(expr);
      });

      // Show top tissues by maximum transcript expression
      const tissueMaxExpression = Object.entries(tissueGroups).map(([tissueId, transcripts]) => {
        const maxExpression = Math.max(...transcripts.map(t => t.median));
        return { tissueId, maxExpression, transcripts };
      }).sort((a, b) => b.maxExpression - a.maxExpression);

      const topTissuesCount = Math.min(5, tissueMaxExpression.length);
      output += `**Top ${topTissuesCount} expressing tissues:**\n`;
      
      tissueMaxExpression.slice(0, topTissuesCount).forEach(({ tissueId, transcripts }) => {
        const tissueDisplayName = this.getTissueDisplayName(tissueId);
        output += `\n**${tissueDisplayName}** (${transcripts.length} transcripts):\n`;
        
        const sortedTranscripts = transcripts.sort((a, b) => b.median - a.median);
        const topTranscripts = sortedTranscripts.slice(0, 3);
        
        topTranscripts.forEach((transcript, index) => {
          output += `  ${index + 1}. ${transcript.transcriptId}: ${transcript.median.toFixed(3)} ${transcript.unit}\n`;
        });
        
        if (sortedTranscripts.length > 3) {
          output += `  ... and ${sortedTranscripts.length - 3} more transcripts\n`;
        }
      });

      output += '\n';
    });

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Get top expressed genes in specific tissues
   */
  async getTopExpressedGenes(args: any) {
    if (!args.tissueId || typeof args.tissueId !== 'string') {
      throw new Error('tissueId parameter is required and must be a tissue ID string');
    }

    const result = await this.apiClient.getTopExpressedGenes(
      args.tissueId,
      args.datasetId || 'gtex_v8',
      args.filterMtGene !== false, // Default to true
      args.limit || 50
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving top expressed genes: ${result.error}`
        }],
        isError: true
      };
    }

    const genes = result.data || [];
    if (genes.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No expression data found for tissue: ${args.tissueId}`
        }]
      };
    }

    const tissueDisplayName = this.getTissueDisplayName(args.tissueId);
    let output = `**Top Expressed Genes in ${tissueDisplayName}**\n`;
    output += `Dataset: ${genes[0]?.datasetId}\n`;
    output += `Mitochondrial genes ${args.filterMtGene !== false ? 'excluded' : 'included'}\n`;
    output += `Showing top ${genes.length} genes\n\n`;

    genes.forEach((gene, index) => {
      output += `${(index + 1).toString().padStart(2)}. **${gene.geneSymbol}** (${gene.gencodeId})\n`;
      output += `    Expression: ${gene.median.toFixed(3)} ${gene.unit}\n`;
    });

    // Expression level analysis
    const expressions = genes.map(g => g.median);
    const stats = {
      highest: Math.max(...expressions),
      lowest: Math.min(...expressions),
      mean: expressions.reduce((sum, val) => sum + val, 0) / expressions.length,
      median: expressions[Math.floor(expressions.length / 2)]
    };

    output += `\n**Expression Statistics:**\n`;
    output += `  • Highest: ${stats.highest.toFixed(3)} ${genes[0].unit}\n`;
    output += `  • Lowest: ${stats.lowest.toFixed(3)} ${genes[0].unit}\n`;
    output += `  • Mean: ${stats.mean.toFixed(3)} ${genes[0].unit}\n`;
    output += `  • Median: ${stats.median.toFixed(3)} ${genes[0].unit}\n`;

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Get expression PCA data
   */
  async getExpressionPCA(args: any) {
    if (!args.tissueIds || !Array.isArray(args.tissueIds) || args.tissueIds.length === 0) {
      throw new Error('tissueIds parameter is required and must be a non-empty array of tissue IDs');
    }

    const result = await this.apiClient.getExpressionPCA(
      args.tissueIds,
      args.datasetId || 'gtex_v8'
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving expression PCA data: ${result.error}`
        }],
        isError: true
      };
    }

    const pcaData = result.data || [];
    if (pcaData.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No PCA data found for the specified tissues: ${args.tissueIds.join(', ')}`
        }]
      };
    }

    // Group by tissue
    const tissueGroups: { [key: string]: any[] } = {};
    pcaData.forEach(pca => {
      if (!tissueGroups[pca.tissueSiteDetailId]) {
        tissueGroups[pca.tissueSiteDetailId] = [];
      }
      tissueGroups[pca.tissueSiteDetailId].push(pca);
    });

    let output = `**Expression PCA Analysis**\n`;
    output += `Dataset: ${pcaData[0]?.datasetId}\n`;
    output += `Total samples: ${pcaData.length}\n`;
    output += `Tissues: ${Object.keys(tissueGroups).length}\n\n`;

    Object.entries(tissueGroups).forEach(([tissueId, samples]) => {
      const tissueDisplayName = this.getTissueDisplayName(tissueId);
      output += `### ${tissueDisplayName} (${samples.length} samples)\n`;
      
      // Calculate PC statistics
      const pc1Values = samples.map(s => s.pc1);
      const pc2Values = samples.map(s => s.pc2);
      const pc3Values = samples.map(s => s.pc3);
      
      const pc1Stats = this.calculateBasicStats(pc1Values);
      const pc2Stats = this.calculateBasicStats(pc2Values);
      const pc3Stats = this.calculateBasicStats(pc3Values);
      
      output += `**Principal Components (ranges):**\n`;
      output += `  • PC1: ${pc1Stats.min.toFixed(3)} to ${pc1Stats.max.toFixed(3)} (mean: ${pc1Stats.mean.toFixed(3)})\n`;
      output += `  • PC2: ${pc2Stats.min.toFixed(3)} to ${pc2Stats.max.toFixed(3)} (mean: ${pc2Stats.mean.toFixed(3)})\n`;
      output += `  • PC3: ${pc3Stats.min.toFixed(3)} to ${pc3Stats.max.toFixed(3)} (mean: ${pc3Stats.mean.toFixed(3)})\n\n`;
      
      // Show a few sample examples
      if (samples.length > 0) {
        output += `**Sample Examples:**\n`;
        const sampleExamples = samples.slice(0, 3);
        sampleExamples.forEach((sample, index) => {
          output += `  ${index + 1}. ${sample.sampleId}: PC1=${sample.pc1.toFixed(3)}, PC2=${sample.pc2.toFixed(3)}, PC3=${sample.pc3.toFixed(3)}\n`;
        });
        if (samples.length > 3) {
          output += `  ... and ${samples.length - 3} more samples\n`;
        }
        output += '\n';
      }
    });

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Get single nucleus RNA-seq expression data
   */
  async getSingleNucleusExpression(args: any) {
    if (!args.geneIds || !Array.isArray(args.geneIds) || args.geneIds.length === 0) {
      throw new Error('geneIds parameter is required and must be a non-empty array of gene IDs');
    }

    const result = await this.apiClient.getSingleNucleusExpression(
      args.geneIds,
      args.datasetId || 'gtex_snrnaseq_pilot',
      args.tissueIds,
      args.excludeDataArray !== false // Default to true
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving single nucleus expression data: ${result.error}`
        }],
        isError: true
      };
    }

    const expressions = result.data || [];
    if (expressions.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No single nucleus expression data found for the specified genes."
        }]
      };
    }

    let output = `**Single Nucleus RNA-seq Expression**\n`;
    output += `Dataset: ${expressions[0]?.datasetId}\n`;
    output += `Genes: ${expressions.length}\n\n`;

    expressions.forEach(expr => {
      const tissueDisplayName = this.getTissueDisplayName(expr.tissueSiteDetailId);
      output += `### ${expr.geneSymbol} (${expr.gencodeId}) - ${tissueDisplayName}\n`;
      
      if (expr.cellTypes && expr.cellTypes.length > 0) {
        // Sort cell types by expression level
        const sortedCellTypes = expr.cellTypes.sort((a, b) => b.meanWithoutZeros - a.meanWithoutZeros);
        
        output += `**Cell Type Expression (${sortedCellTypes.length} cell types):**\n`;
        sortedCellTypes.forEach((cellType, index) => {
          const detectionRate = ((cellType.count - cellType.numZeros) / cellType.count * 100);
          output += `  ${index + 1}. **${cellType.cellType}** (${cellType.count} cells)\n`;
          output += `     • Mean (all cells): ${cellType.meanWithZeros.toFixed(3)} ${expr.unit}\n`;
          output += `     • Mean (expressing): ${cellType.meanWithoutZeros.toFixed(3)} ${expr.unit}\n`;
          output += `     • Median (expressing): ${cellType.medianWithoutZeros.toFixed(3)} ${expr.unit}\n`;
          output += `     • Detection rate: ${detectionRate.toFixed(1)}%\n`;
        });
      } else {
        output += `No cell type data available.\n`;
      }
      output += '\n';
    });

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Get single nucleus expression summary
   */
  async getSingleNucleusSummary(args: any) {
    const result = await this.apiClient.getSingleNucleusSummary(
      args.datasetId || 'gtex_snrnaseq_pilot',
      args.tissueIds
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving single nucleus summary: ${result.error}`
        }],
        isError: true
      };
    }

    const summaries = result.data || [];
    if (summaries.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No single nucleus summary data found."
        }]
      };
    }

    // Group by tissue
    const tissueGroups: { [key: string]: any[] } = {};
    summaries.forEach(summary => {
      if (!tissueGroups[summary.tissueSiteDetailId]) {
        tissueGroups[summary.tissueSiteDetailId] = [];
      }
      tissueGroups[summary.tissueSiteDetailId].push(summary);
    });

    let output = `**Single Nucleus RNA-seq Summary**\n`;
    output += `Dataset: ${summaries[0]?.datasetId}\n`;
    output += `Tissues: ${Object.keys(tissueGroups).length}\n\n`;

    Object.entries(tissueGroups).forEach(([tissueId, tissueSummaries]) => {
      const tissueDisplayName = this.getTissueDisplayName(tissueId);
      const totalCells = tissueSummaries.reduce((sum, s) => sum + s.numCells, 0);
      
      output += `### ${tissueDisplayName}\n`;
      output += `**Total cells:** ${totalCells.toLocaleString()}\n`;
      output += `**Cell types:** ${tissueSummaries.length}\n\n`;
      
      // Sort by cell count
      const sortedSummaries = tissueSummaries.sort((a, b) => b.numCells - a.numCells);
      
      output += `**Cell Type Distribution:**\n`;
      sortedSummaries.forEach((summary, index) => {
        const percentage = (summary.numCells / totalCells * 100);
        output += `  ${index + 1}. **${summary.cellType}**: ${summary.numCells.toLocaleString()} cells (${percentage.toFixed(1)}%)\n`;
      });
      output += '\n';
    });

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Get genes with tissue-specific expression patterns
   */
  async getTissueSpecificGenes(args: any) {
    if (!args.tissueId || typeof args.tissueId !== 'string') {
      throw new Error('tissueId parameter is required and must be a tissue ID string');
    }

    // Get top expressed genes for this tissue
    const topGenesResult = await this.apiClient.getTopExpressedGenes(
      args.tissueId,
      args.datasetId || 'gtex_v8',
      true, // Filter MT genes
      100 // Get more genes for specificity analysis
    );

    if (topGenesResult.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving tissue-specific genes: ${topGenesResult.error}`
        }],
        isError: true
      };
    }

    const topGenes = topGenesResult.data || [];
    if (topGenes.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No expression data found for tissue: ${args.tissueId}`
        }]
      };
    }

    // For tissue specificity, we'll analyze the top genes
    // In a real implementation, this would compare across all tissues
    const tissueDisplayName = this.getTissueDisplayName(args.tissueId);
    
    let output = `**Tissue-Specific Genes in ${tissueDisplayName}**\n`;
    output += `Dataset: ${topGenes[0]?.datasetId}\n`;
    output += `Analysis: Top expressing genes (tissue specificity analysis)\n\n`;

    // Show top tissue-specific candidates
    const specificGenes = topGenes.slice(0, 20);
    
    output += `**Candidate Tissue-Specific Genes (${specificGenes.length}):**\n`;
    specificGenes.forEach((gene, index) => {
      output += `${(index + 1).toString().padStart(2)}. **${gene.geneSymbol}** (${gene.gencodeId})\n`;
      output += `    • Expression: ${gene.median.toFixed(3)} ${gene.unit}\n`;
      output += `    • Rank in tissue: ${index + 1}\n`;
    });

    output += `\n**Note:** This analysis shows highly expressed genes in ${tissueDisplayName}. `;
    output += `True tissue specificity requires comparison across all tissues using advanced statistical methods.\n`;

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Get clustered gene expression data for visualization
   */
  async getClusteredExpression(args: any) {
    if (!args.geneIds || !Array.isArray(args.geneIds) || args.geneIds.length === 0) {
      throw new Error('geneIds parameter is required and must be a non-empty array of gene IDs');
    }

    if (args.geneIds.length > 20) {
      return {
        content: [{
          type: "text",
          text: "Maximum 20 genes can be processed for clustering analysis."
        }]
      };
    }

    // Get median expression for all genes
    const result = await this.apiClient.getMedianGeneExpression(
      args.geneIds,
      args.datasetId || 'gtex_v8'
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving clustered expression data: ${result.error}`
        }],
        isError: true
      };
    }

    const expressions = result.data || [];
    if (expressions.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No expression data found for clustering analysis."
        }]
      };
    }

    // Organize data for clustering visualization
    const geneGroups: { [key: string]: any[] } = {};
    expressions.forEach(expr => {
      const key = `${expr.geneSymbol} (${expr.gencodeId})`;
      if (!geneGroups[key]) {
        geneGroups[key] = [];
      }
      geneGroups[key].push(expr);
    });

    let output = `**Clustered Gene Expression Analysis**\n`;
    output += `Genes: ${Object.keys(geneGroups).length}\n`;
    output += `Dataset: ${expressions[0]?.datasetId}\n`;
    output += `Format: Median expression values for clustering\n\n`;

    // Create expression matrix summary
    output += `**Expression Matrix Summary:**\n`;
    Object.entries(geneGroups).forEach(([geneKey, geneExpressions]) => {
      const sortedExpr = geneExpressions.sort((a, b) => b.median - a.median);
      const stats = {
        max: Math.max(...sortedExpr.map(e => e.median)),
        min: Math.min(...sortedExpr.map(e => e.median)),
        tissues: sortedExpr.length
      };
      
      output += `• **${geneKey}**:\n`;
      output += `  - Tissues: ${stats.tissues}\n`;
      output += `  - Range: ${stats.min.toFixed(3)} - ${stats.max.toFixed(3)} TPM\n`;
      output += `  - Top tissue: ${this.getTissueDisplayName(sortedExpr[0].tissueSiteDetailId)} (${sortedExpr[0].median.toFixed(3)})\n`;
    });

    output += `\n**Clustering Notes:**\n`;
    output += `- Expression values are median TPM across samples\n`;
    output += `- Data suitable for hierarchical clustering or PCA analysis\n`;
    output += `- Consider log-transformation for clustering algorithms\n`;

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Calculate expression correlation between genes across tissues
   */
  async calculateExpressionCorrelation(args: any) {
    if (!args.geneIds || !Array.isArray(args.geneIds) || args.geneIds.length < 2) {
      throw new Error('geneIds parameter is required and must contain at least 2 gene IDs for correlation analysis');
    }

    if (args.geneIds.length > 10) {
      return {
        content: [{
          type: "text",
          text: "Maximum 10 genes can be processed for correlation analysis."
        }]
      };
    }

    // Get median expression for all genes
    const result = await this.apiClient.getMedianGeneExpression(
      args.geneIds,
      args.datasetId || 'gtex_v8'
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error calculating expression correlation: ${result.error}`
        }],
        isError: true
      };
    }

    const expressions = result.data || [];
    if (expressions.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No expression data found for correlation analysis."
        }]
      };
    }

    // Organize by gene and tissue
    const geneData: { [gene: string]: { [tissue: string]: number } } = {};
    const geneNames: { [gene: string]: string } = {};
    
    expressions.forEach(expr => {
      const geneKey = expr.gencodeId;
      geneNames[geneKey] = expr.geneSymbol;
      if (!geneData[geneKey]) {
        geneData[geneKey] = {};
      }
      geneData[geneKey][expr.tissueSiteDetailId] = expr.median;
    });

    // Find common tissues
    const genes = Object.keys(geneData);
    const commonTissues = Object.keys(geneData[genes[0]] || {});
    
    // Calculate pairwise correlations
    let output = `**Gene Expression Correlation Analysis**\n`;
    output += `Genes: ${genes.length}\n`;
    output += `Common tissues: ${commonTissues.length}\n`;
    output += `Dataset: ${expressions[0]?.datasetId}\n\n`;

    if (commonTissues.length < 5) {
      output += `⚠️ **Warning**: Only ${commonTissues.length} common tissues found. Correlation analysis requires more data points for reliability.\n\n`;
    }

    output += `**Pairwise Correlations:**\n`;
    
    for (let i = 0; i < genes.length; i++) {
      for (let j = i + 1; j < genes.length; j++) {
        const gene1 = genes[i];
        const gene2 = genes[j];
        
        // Calculate Pearson correlation
        const values1 = commonTissues.map(t => geneData[gene1][t]).filter(v => v !== undefined);
        const values2 = commonTissues.map(t => geneData[gene2][t]).filter(v => v !== undefined);
        
        if (values1.length !== values2.length || values1.length < 3) {
          output += `• **${geneNames[gene1]}** vs **${geneNames[gene2]}**: Insufficient data\n`;
          continue;
        }
        
        const correlation = this.calculatePearsonCorrelation(values1, values2);
        const strength = Math.abs(correlation) > 0.7 ? "Strong" : 
                        Math.abs(correlation) > 0.4 ? "Moderate" : "Weak";
        
        output += `• **${geneNames[gene1]}** vs **${geneNames[gene2]}**: r = ${correlation.toFixed(3)} (${strength})\n`;
      }
    }

    output += `\n**Analysis Notes:**\n`;
    output += `- Correlations calculated using median expression across tissues\n`;
    output += `- |r| > 0.7: Strong correlation, |r| > 0.4: Moderate correlation\n`;
    output += `- Based on ${commonTissues.length} tissue samples\n`;

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Get differential gene expression between tissue groups
   */
  async getDifferentialExpression(args: any) {
    if (!args.geneId || typeof args.geneId !== 'string') {
      throw new Error('geneId parameter is required and must be a gene ID');
    }
    
    if (!args.comparisonGroups || !Array.isArray(args.comparisonGroups) || args.comparisonGroups.length < 2) {
      throw new Error('comparisonGroups parameter is required and must contain at least 2 tissue groups');
    }

    // Get median expression for the gene
    const result = await this.apiClient.getMedianGeneExpression(
      [args.geneId],
      args.datasetId || 'gtex_v8'
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving differential expression data: ${result.error}`
        }],
        isError: true
      };
    }

    const expressions = result.data || [];
    if (expressions.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No expression data found for gene: ${args.geneId}`
        }]
      };
    }

    const geneName = expressions[0].geneSymbol;
    
    // Group tissues by comparison groups (simplified - using tissue name matching)
    const groupData: { [group: string]: any[] } = {};
    
    expressions.forEach(expr => {
      const tissueName = expr.tissueSiteDetailId.toLowerCase();
      
      // Simple matching logic for common tissue groups
      for (const group of args.comparisonGroups) {
        const groupLower = group.toLowerCase();
        if (tissueName.includes(groupLower) || 
            (groupLower === 'brain' && tissueName.includes('brain')) ||
            (groupLower === 'heart' && tissueName.includes('heart')) ||
            (groupLower === 'muscle' && tissueName.includes('muscle')) ||
            (groupLower === 'skin' && tissueName.includes('skin'))) {
          
          if (!groupData[group]) {
            groupData[group] = [];
          }
          groupData[group].push(expr);
          break;
        }
      }
    });

    let output = `**Differential Expression Analysis**\n`;
    output += `Gene: **${geneName}** (${args.geneId})\n`;
    output += `Dataset: ${expressions[0].datasetId}\n`;
    output += `Comparison Groups: ${args.comparisonGroups.join(' vs ')}\n\n`;

    // Show results for each group
    const groupStats: { [group: string]: { mean: number, count: number, tissues: string[] } } = {};
    
    Object.entries(groupData).forEach(([group, groupExpressions]) => {
      if (groupExpressions.length === 0) {
        output += `**${group}**: No matching tissues found\n`;
        return;
      }

      const values = groupExpressions.map(e => e.median);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const tissues = groupExpressions.map(e => this.getTissueDisplayName(e.tissueSiteDetailId));
      
      groupStats[group] = { mean, count: values.length, tissues };
      
      output += `**${group} (${values.length} tissues)**:\n`;
      output += `  • Mean expression: ${mean.toFixed(3)} TPM\n`;
      output += `  • Range: ${Math.min(...values).toFixed(3)} - ${Math.max(...values).toFixed(3)} TPM\n`;
      output += `  • Tissues: ${tissues.join(', ')}\n\n`;
    });

    // Calculate fold changes between groups
    const groups = Object.keys(groupStats);
    if (groups.length >= 2) {
      output += `**Differential Analysis:**\n`;
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const group1 = groups[i];
          const group2 = groups[j];
          const foldChange = groupStats[group1].mean / groupStats[group2].mean;
          const logFC = Math.log2(foldChange);
          
          output += `• **${group1} vs ${group2}**:\n`;
          output += `  - Fold change: ${foldChange.toFixed(3)}x\n`;
          output += `  - Log2(FC): ${logFC.toFixed(3)}\n`;
          output += `  - Direction: ${foldChange > 1 ? `Higher in ${group1}` : `Higher in ${group2}`}\n`;
        }
      }
    }

    output += `\n**Note**: This is a simplified differential analysis using median values. `;
    output += `Proper differential expression requires statistical testing with sample-level data.\n`;

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Helper function to get tissue display name
   */
  private getTissueDisplayName(tissueId: string): string {
    // Convert tissue ID to more readable format
    return tissueId.replace(/_/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate basic statistics for expression data
   */
  private calculateExpressionStats(data: number[]) {
    if (!data || data.length === 0) {
      return { mean: 0, median: 0, min: 0, max: 0, nonZeroCount: 0, nonZeroPercent: 0 };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((acc, val) => acc + val, 0);
    const nonZeroCount = data.filter(val => val > 0).length;

    return {
      mean: sum / data.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      nonZeroCount,
      nonZeroPercent: (nonZeroCount / data.length) * 100
    };
  }

  /**
   * Calculate basic statistics for numeric arrays
   */
  private calculateBasicStats(data: number[]) {
    if (!data || data.length === 0) {
      return { mean: 0, min: 0, max: 0 };
    }

    const sum = data.reduce((acc, val) => acc + val, 0);
    return {
      mean: sum / data.length,
      min: Math.min(...data),
      max: Math.max(...data)
    };
  }
}
