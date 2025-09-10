/**
 * GTEx Association Analysis Tool Handlers
 * Implements MCP tools for eQTL/sQTL and other genetic association analysis
 */

import { GTExApiClient } from '../utils/api-client.js';

export class AssociationHandlers {
  private apiClient: GTExApiClient;

  constructor() {
    this.apiClient = new GTExApiClient();
  }

  /**
   * Get eQTL genes (genes with significant cis-eQTLs)
   */
  async getEQTLGenes(args: any) {
    const result = await this.apiClient.getEQTLGenes({
      tissueSiteDetailId: args.tissueIds,
      datasetId: args.datasetId || 'gtex_v8',
      page: args.page || 0,
      itemsPerPage: args.itemsPerPage || 250
    });

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving eQTL genes: ${result.error}`
        }],
        isError: true
      };
    }

    const eqtlGenes = result.data || [];
    if (eqtlGenes.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No eQTL genes found${args.tissueIds ? ` for tissues: ${args.tissueIds.join(', ')}` : ''}`
        }]
      };
    }

    // Group by tissue for better organization
    const tissueGroups: { [key: string]: any[] } = {};
    eqtlGenes.forEach(gene => {
      if (!tissueGroups[gene.tissueSiteDetailId]) {
        tissueGroups[gene.tissueSiteDetailId] = [];
      }
      tissueGroups[gene.tissueSiteDetailId].push(gene);
    });

    let output = `**eQTL Genes (${eqtlGenes.length} results)**\n`;
    output += `Dataset: ${eqtlGenes[0]?.datasetId}\n`;
    output += `Tissues: ${Object.keys(tissueGroups).length}\n\n`;

    Object.entries(tissueGroups).forEach(([tissueId, genes]) => {
      const tissueDisplayName = this.getTissueDisplayName(tissueId);
      output += `### ${tissueDisplayName} (${genes.length} eGenes)\n`;

      // Sort by significance (lowest q-value first)
      const sortedGenes = genes.sort((a, b) => a.qValue - b.qValue);
      
      // Show top significant genes
      const topCount = Math.min(10, sortedGenes.length);
      sortedGenes.slice(0, topCount).forEach((gene, index) => {
        output += `${(index + 1).toString().padStart(2)}. **${gene.geneSymbol}** (${gene.gencodeId})\n`;
        output += `    • p-value: ${gene.pValue.toExponential(2)}\n`;
        output += `    • q-value: ${gene.qValue.toFixed(4)}\n`;
        output += `    • Empirical p-value: ${gene.empiricalPValue.toExponential(2)}\n`;
        output += `    • Log2 allelic fold change: ${gene.log2AllelicFoldChange.toFixed(3)}\n`;
        output += `    • p-value threshold: ${gene.pValueThreshold.toExponential(2)}\n`;
      });

      if (sortedGenes.length > topCount) {
        output += `    ... and ${sortedGenes.length - topCount} more eGenes\n`;
      }

      // Statistics for this tissue
      const qValues = sortedGenes.map(g => g.qValue);
      const foldChanges = sortedGenes.map(g => Math.abs(g.log2AllelicFoldChange));
      
      output += `\n**Tissue Summary:**\n`;
      output += `  • Total eGenes: ${genes.length}\n`;
      output += `  • Most significant q-value: ${Math.min(...qValues).toExponential(2)}\n`;
      output += `  • Mean |fold change|: ${(foldChanges.reduce((sum, fc) => sum + fc, 0) / foldChanges.length).toFixed(3)}\n`;
      output += `  • Max |fold change|: ${Math.max(...foldChanges).toFixed(3)}\n\n`;
    });

    if (result.paging_info && result.paging_info.totalNumberOfItems > eqtlGenes.length) {
      output += `**Note:** Showing ${eqtlGenes.length} of ${result.paging_info.totalNumberOfItems} total results.\n`;
    }

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Get single tissue eQTLs
   */
  async getSingleTissueEQTLs(args: any) {
    if (!args.geneIds && !args.variantIds && !args.tissueIds) {
      throw new Error('At least one of geneIds, variantIds, or tissueIds must be provided');
    }

    const result = await this.apiClient.getSingleTissueEQTLs({
      gencodeId: args.geneIds,
      variantId: args.variantIds,
      tissueSiteDetailId: args.tissueIds,
      datasetId: args.datasetId || 'gtex_v8',
      page: args.page || 0,
      itemsPerPage: args.itemsPerPage || 250
    });

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving single tissue eQTLs: ${result.error}`
        }],
        isError: true
      };
    }

    const eqtls = result.data || [];
    if (eqtls.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No significant single tissue eQTLs found for the specified parameters."
        }]
      };
    }

    let output = `**Single Tissue eQTLs (${eqtls.length} results)**\n`;
    output += `Dataset: ${eqtls[0]?.datasetId}\n\n`;

    // Group by gene or tissue depending on query
    if (args.geneIds && args.geneIds.length === 1) {
      // Single gene query - group by tissue
      const tissueGroups: { [key: string]: any[] } = {};
      eqtls.forEach(eqtl => {
        if (!tissueGroups[eqtl.tissueSiteDetailId]) {
          tissueGroups[eqtl.tissueSiteDetailId] = [];
        }
        tissueGroups[eqtl.tissueSiteDetailId].push(eqtl);
      });

      const geneName = eqtls[0]?.geneSymbol;
      output += `**Gene:** ${geneName} (${eqtls[0]?.gencodeId})\n\n`;

      Object.entries(tissueGroups).forEach(([tissueId, tissueEqtls]) => {
        const tissueDisplayName = this.getTissueDisplayName(tissueId);
        output += `### ${tissueDisplayName} (${tissueEqtls.length} eQTLs)\n`;

        // Sort by significance
        const sortedEqtls = tissueEqtls.sort((a, b) => a.pValue - b.pValue);
        const topEqtls = sortedEqtls.slice(0, 5);

        topEqtls.forEach((eqtl, index) => {
          output += `${index + 1}. **${eqtl.snpId}** (${eqtl.variantId})\n`;
          output += `   • Position: ${eqtl.chromosome}:${eqtl.pos.toLocaleString()}\n`;
          output += `   • p-value: ${eqtl.pValue.toExponential(2)}\n`;
          output += `   • NES: ${eqtl.nes.toFixed(3)}\n`;
        });

        if (sortedEqtls.length > 5) {
          output += `   ... and ${sortedEqtls.length - 5} more eQTLs\n`;
        }
        output += '\n';
      });

    } else {
      // Multiple genes or other query types - group by gene
      const geneGroups: { [key: string]: any[] } = {};
      eqtls.forEach(eqtl => {
        const key = `${eqtl.geneSymbol} (${eqtl.gencodeId})`;
        if (!geneGroups[key]) {
          geneGroups[key] = [];
        }
        geneGroups[key].push(eqtl);
      });

      Object.entries(geneGroups).forEach(([geneKey, geneEqtls]) => {
        output += `### ${geneKey}\n`;

        // Group by tissue within gene
        const tissueGroups: { [key: string]: any[] } = {};
        geneEqtls.forEach(eqtl => {
          if (!tissueGroups[eqtl.tissueSiteDetailId]) {
            tissueGroups[eqtl.tissueSiteDetailId] = [];
          }
          tissueGroups[eqtl.tissueSiteDetailId].push(eqtl);
        });

        // Show most significant eQTL per tissue
        Object.entries(tissueGroups).forEach(([tissueId, tissueEqtls]) => {
          const tissueDisplayName = this.getTissueDisplayName(tissueId);
          const bestEqtl = tissueEqtls.sort((a, b) => a.pValue - b.pValue)[0];
          
          output += `  **${tissueDisplayName}**: ${bestEqtl.snpId} (p=${bestEqtl.pValue.toExponential(2)}, NES=${bestEqtl.nes.toFixed(3)})`;
          if (tissueEqtls.length > 1) {
            output += ` + ${tissueEqtls.length - 1} more`;
          }
          output += '\n';
        });
        output += '\n';
      });
    }

    if (result.paging_info && result.paging_info.totalNumberOfItems > eqtls.length) {
      output += `**Note:** Showing ${eqtls.length} of ${result.paging_info.totalNumberOfItems} total results.\n`;
    }

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Get multi-tissue eQTL meta-analysis results
   */
  async getMultiTissueEQTLs(args: any) {
    if (!args.geneId || typeof args.geneId !== 'string') {
      throw new Error('geneId parameter is required and must be a gene ID string');
    }

    const result = await this.apiClient.getMultiTissueEQTLs(
      args.geneId,
      args.variantId,
      args.datasetId || 'gtex_v8'
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving multi-tissue eQTL data: ${result.error}`
        }],
        isError: true
      };
    }

    const metaResults = result.data || [];
    if (metaResults.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No multi-tissue eQTL results found for gene: ${args.geneId}`
        }]
      };
    }

    let output = `**Multi-Tissue eQTL Meta-Analysis**\n`;
    output += `Gene: ${args.geneId}\n`;
    output += `Dataset: ${metaResults[0]?.datasetId}\n`;
    output += `Results: ${metaResults.length} gene-variant combinations\n\n`;

    metaResults.forEach((result, index) => {
      output += `### Result ${index + 1}: ${result.variantId}\n`;
      output += `**Meta p-value:** ${result.metaP.toExponential(2)}\n`;
      output += `**Gene:** ${result.gencodeId}\n\n`;

      if (result.tissues && Object.keys(result.tissues).length > 0) {
        // Sort tissues by m-value (posterior probability)
        const tissueEntries = Object.entries(result.tissues);
        tissueEntries.sort((a, b) => b[1].mValue - a[1].mValue);

        output += `**Tissue-Specific Results:**\n`;
        const topTissues = tissueEntries.slice(0, 10); // Show top 10 tissues
        
        topTissues.forEach(([tissueName, tissueData]) => {
          const tissueDisplayName = this.getTissueDisplayName(tissueName);
          output += `  **${tissueDisplayName}**:\n`;
          output += `    • m-value (posterior prob): ${tissueData.mValue.toFixed(4)}\n`;
          output += `    • p-value: ${tissueData.pValue.toExponential(2)}\n`;
          output += `    • NES: ${tissueData.nes.toFixed(3)}\n`;
          output += `    • Standard error: ${tissueData.se.toFixed(4)}\n`;
        });

        if (tissueEntries.length > 10) {
          output += `  ... and ${tissueEntries.length - 10} more tissues\n`;
        }

        // Summary statistics
        const mValues = tissueEntries.map(([, data]) => data.mValue);
        const nesValues = tissueEntries.map(([, data]) => data.nes);
        const significantTissues = tissueEntries.filter(([, data]) => data.mValue > 0.5);

        output += `\n**Summary:**\n`;
        output += `  • Tissues analyzed: ${tissueEntries.length}\n`;
        output += `  • Tissues with m-value > 0.5: ${significantTissues.length}\n`;
        output += `  • Max m-value: ${Math.max(...mValues).toFixed(4)}\n`;
        output += `  • Mean |NES|: ${(nesValues.map(n => Math.abs(n)).reduce((sum, n) => sum + n, 0) / nesValues.length).toFixed(3)}\n`;
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
   * Calculate dynamic eQTL for specific gene-variant-tissue combination
   */
  async calculateDynamicEQTL(args: any) {
    if (!args.geneId || !args.variantId || !args.tissueId) {
      throw new Error('geneId, variantId, and tissueId parameters are all required');
    }

    const result = await this.apiClient.calculateDynamicEQTL({
      gencodeId: args.geneId,
      variantId: args.variantId,
      tissueSiteDetailId: args.tissueId,
      datasetId: args.datasetId || 'gtex_v8'
    });

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error calculating dynamic eQTL: ${result.error}`
        }],
        isError: true
      };
    }

    const eqtlResult = result.data;
    if (!eqtlResult) {
      return {
        content: [{
          type: "text",
          text: "No dynamic eQTL result returned."
        }]
      };
    }

    const tissueDisplayName = this.getTissueDisplayName(args.tissueId);
    
    let output = `**Dynamic eQTL Calculation**\n`;
    output += `Gene: **${eqtlResult.geneSymbol}** (${eqtlResult.gencodeId})\n`;
    output += `Variant: **${eqtlResult.variantId}**\n`;
    output += `Tissue: **${tissueDisplayName}**\n\n`;

    if (eqtlResult.error && eqtlResult.error !== 0) {
      output += `⚠️ **Calculation Error:** Error code ${eqtlResult.error}\n\n`;
    }

    output += `**Statistical Results:**\n`;
    output += `• p-value: ${eqtlResult.pValue.toExponential(2)}\n`;
    output += `• Normalized Effect Size (NES): ${eqtlResult.nes.toFixed(4)}\n`;
    output += `• t-statistic: ${eqtlResult.tStatistic.toFixed(4)}\n`;
    output += `• Minor Allele Frequency: ${(eqtlResult.maf * 100).toFixed(2)}%\n`;
    output += `• p-value threshold: ${eqtlResult.pValueThreshold.toExponential(2)}\n`;

    const isSignificant = eqtlResult.pValue < eqtlResult.pValueThreshold;
    output += `• **Significance:** ${isSignificant ? '✅ Significant' : '❌ Not significant'}\n\n`;

    output += `**Genotype Distribution:**\n`;
    output += `• Homozygous reference: ${eqtlResult.homoRefCount} samples\n`;
    output += `• Heterozygous: ${eqtlResult.hetCount} samples\n`;
    output += `• Homozygous alternate: ${eqtlResult.homoAltCount} samples\n`;
    const totalSamples = eqtlResult.homoRefCount + eqtlResult.hetCount + eqtlResult.homoAltCount;
    output += `• **Total samples:** ${totalSamples}\n\n`;

    if (eqtlResult.data && eqtlResult.genotypes && eqtlResult.data.length === eqtlResult.genotypes.length && eqtlResult.data.length > 0) {
      // Calculate expression statistics by genotype
      const expressionByGenotype: { [key: number]: number[] } = {};
      eqtlResult.data.forEach((expr, i) => {
        const genotype = eqtlResult.genotypes[i];
        if (!expressionByGenotype[genotype]) {
          expressionByGenotype[genotype] = [];
        }
        expressionByGenotype[genotype].push(expr);
      });

      output += `**Expression by Genotype:**\n`;
      Object.keys(expressionByGenotype).sort().forEach(genotype => {
        const expressions = expressionByGenotype[parseInt(genotype)];
        const mean = expressions.reduce((sum, val) => sum + val, 0) / expressions.length;
        const genotypeLabel = genotype === '0' ? 'Ref/Ref' : genotype === '1' ? 'Ref/Alt' : 'Alt/Alt';
        output += `• ${genotypeLabel}: ${mean.toFixed(3)} TPM (${expressions.length} samples)\n`;
      });
    }

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Get sQTL genes (splicing QTL genes)
   */
  async getSQTLGenes(args: any) {
    const result = await this.apiClient.getSQTLGenes(
      args.tissueIds,
      args.datasetId || 'gtex_v8'
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving sQTL genes: ${result.error}`
        }],
        isError: true
      };
    }

    const sqtlGenes = result.data || [];
    if (sqtlGenes.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No sQTL genes found${args.tissueIds ? ` for tissues: ${args.tissueIds.join(', ')}` : ''}`
        }]
      };
    }

    // Group by tissue
    const tissueGroups: { [key: string]: any[] } = {};
    sqtlGenes.forEach(gene => {
      if (!tissueGroups[gene.tissueSiteDetailId]) {
        tissueGroups[gene.tissueSiteDetailId] = [];
      }
      tissueGroups[gene.tissueSiteDetailId].push(gene);
    });

    let output = `**sQTL Genes (${sqtlGenes.length} results)**\n`;
    output += `Dataset: ${sqtlGenes[0]?.datasetId}\n`;
    output += `Tissues: ${Object.keys(tissueGroups).length}\n\n`;

    Object.entries(tissueGroups).forEach(([tissueId, genes]) => {
      const tissueDisplayName = this.getTissueDisplayName(tissueId);
      output += `### ${tissueDisplayName} (${genes.length} sGenes)\n`;

      // Sort by significance
      const sortedGenes = genes.sort((a, b) => a.qValue - b.qValue);
      
      const topCount = Math.min(10, sortedGenes.length);
      sortedGenes.slice(0, topCount).forEach((gene, index) => {
        output += `${(index + 1).toString().padStart(2)}. **${gene.geneSymbol}** (${gene.gencodeId})\n`;
        output += `    • Phenotype: ${gene.phenotypeId}\n`;
        output += `    • p-value: ${gene.pValue.toExponential(2)}\n`;
        output += `    • q-value: ${gene.qValue.toFixed(4)}\n`;
        output += `    • Empirical p-value: ${gene.empiricalPValue.toExponential(2)}\n`;
        output += `    • # Phenotypes tested: ${gene.nPhenotypes}\n`;
        output += `    • p-value threshold: ${gene.pValueThreshold.toExponential(2)}\n`;
      });

      if (sortedGenes.length > topCount) {
        output += `    ... and ${sortedGenes.length - topCount} more sGenes\n`;
      }

      // Tissue summary
      const qValues = sortedGenes.map(g => g.qValue);
      output += `\n**Tissue Summary:**\n`;
      output += `  • Total sGenes: ${genes.length}\n`;
      output += `  • Most significant q-value: ${Math.min(...qValues).toExponential(2)}\n`;
      output += `  • Mean phenotypes per gene: ${(genes.reduce((sum, g) => sum + g.nPhenotypes, 0) / genes.length).toFixed(1)}\n\n`;
    });

    if (result.paging_info && result.paging_info.totalNumberOfItems > sqtlGenes.length) {
      output += `**Note:** Showing ${sqtlGenes.length} of ${result.paging_info.totalNumberOfItems} total results.\n`;
    }

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Get fine mapping results
   */
  async getFineMapping(args: any) {
    if (!args.geneIds || !Array.isArray(args.geneIds) || args.geneIds.length === 0) {
      throw new Error('geneIds parameter is required and must be a non-empty array of gene IDs');
    }

    const result = await this.apiClient.getFineMapping(
      args.geneIds,
      args.datasetId || 'gtex_v8',
      args.variantId,
      args.tissueIds
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving fine mapping data: ${result.error}`
        }],
        isError: true
      };
    }

    const fineMappings = result.data || [];
    if (fineMappings.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No fine mapping results found for the specified genes."
        }]
      };
    }

    // Group by gene and tissue
    const geneGroups: { [key: string]: any[] } = {};
    fineMappings.forEach(mapping => {
      const key = `${mapping.gencodeId}`;
      if (!geneGroups[key]) {
        geneGroups[key] = [];
      }
      geneGroups[key].push(mapping);
    });

    let output = `**Fine Mapping Results (${fineMappings.length} results)**\n`;
    output += `Dataset: ${fineMappings[0]?.datasetId}\n`;
    output += `Genes: ${Object.keys(geneGroups).length}\n\n`;

    Object.entries(geneGroups).forEach(([geneId, mappings]) => {
      output += `### Gene: ${geneId}\n`;

      // Group by tissue and method
      const tissueGroups: { [key: string]: any[] } = {};
      mappings.forEach(mapping => {
        const key = `${mapping.tissueSiteDetailId}_${mapping.method}`;
        if (!tissueGroups[key]) {
          tissueGroups[key] = [];
        }
        tissueGroups[key].push(mapping);
      });

      Object.entries(tissueGroups).forEach(([tissueMethodKey, tissueMappings]) => {
        const [tissueId, method] = tissueMethodKey.split('_');
        const tissueDisplayName = this.getTissueDisplayName(tissueId);
        
        output += `\n**${tissueDisplayName} - ${method}**\n`;

        // Group by credible set
        const setGroups: { [key: number]: any[] } = {};
        tissueMappings.forEach(mapping => {
          if (!setGroups[mapping.setId]) {
            setGroups[mapping.setId] = [];
          }
          setGroups[mapping.setId].push(mapping);
        });

        Object.entries(setGroups).forEach(([setId, setMappings]) => {
          output += `  **Credible Set ${setId}** (${setMappings[0].setSize} variants):\n`;
          
          // Sort by PIP (posterior inclusion probability)
          const sortedMappings = setMappings.sort((a, b) => b.pip - a.pip);
          const topVariants = sortedMappings.slice(0, 5);
          
          topVariants.forEach((mapping, index) => {
            output += `    ${index + 1}. ${mapping.variantId}: PIP = ${mapping.pip.toFixed(4)}\n`;
          });
          
          if (sortedMappings.length > 5) {
            output += `    ... and ${sortedMappings.length - 5} more variants\n`;
          }

          // Set statistics
          const totalPIP = sortedMappings.reduce((sum, m) => sum + m.pip, 0);
          output += `    **Set Summary:** Total PIP = ${totalPIP.toFixed(4)}, Size = ${setMappings[0].setSize}\n`;
        });
      });
      output += '\n';
    });

    if (result.paging_info && result.paging_info.totalNumberOfItems > fineMappings.length) {
      output += `**Note:** Showing ${fineMappings.length} of ${result.paging_info.totalNumberOfItems} total results.\n`;
    }

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Analyze linkage disequilibrium structure around eQTL variants
   */
  async analyzeLDStructure(args: any) {
    if (!args.chr || !args.position) {
      throw new Error('chr and position parameters are required for LD analysis');
    }
    
    if (typeof args.position !== 'number') {
      throw new Error('position parameter must be a number');
    }

    const windowSize = args.windowSize || 100000;
    const population = args.population || 'EUR';
    
    // For LD analysis, we need to get variants in the region first
    const variantResult = await this.apiClient.getVariants({
      chromosome: args.chr,
      pos: [Math.max(1, args.position - windowSize), args.position + windowSize],
      datasetId: 'gtex_v8',
      page: 0,
      itemsPerPage: 100
    });

    if (variantResult.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving variants for LD analysis: ${variantResult.error}`
        }],
        isError: true
      };
    }

    const variants = variantResult.data || [];
    if (variants.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No variants found in region ${args.chr}:${args.position - windowSize}-${args.position + windowSize}`
        }]
      };
    }

    // Find the closest variant to the query position
    let closestVariant = variants[0];
    let minDistance = Math.abs(closestVariant.pos - args.position);
    
    variants.forEach(variant => {
      const distance = Math.abs(variant.pos - args.position);
      if (distance < minDistance) {
        minDistance = distance;
        closestVariant = variant;
      }
    });

    let output = `**Linkage Disequilibrium Structure Analysis**\n`;
    output += `Query Position: ${args.chr}:${args.position.toLocaleString()}\n`;
    output += `Analysis Window: ±${windowSize.toLocaleString()} bp\n`;
    output += `Population: ${population}\n`;
    output += `Variants Found: ${variants.length}\n\n`;

    output += `**Closest Variant to Query:**\n`;
    output += `• **${closestVariant.variantId}**\n`;
    output += `  - Position: ${args.chr}:${closestVariant.pos.toLocaleString()}\n`;
    output += `  - Distance: ${minDistance.toLocaleString()} bp\n`;
    output += `  - Alleles: ${closestVariant.ref} → ${closestVariant.alt}\n`;
    if (closestVariant.snpId && closestVariant.snpId !== 'nan') {
      output += `  - rsID: ${closestVariant.snpId}\n`;
    }
    output += `  - MAF ≥1%: ${closestVariant.maf01 ? 'Yes' : 'No'}\n\n`;

    // Group variants by distance from query
    const distanceBins = {
      '<1kb': variants.filter(v => Math.abs(v.pos - args.position) < 1000).length,
      '1-10kb': variants.filter(v => Math.abs(v.pos - args.position) >= 1000 && Math.abs(v.pos - args.position) < 10000).length,
      '10-50kb': variants.filter(v => Math.abs(v.pos - args.position) >= 10000 && Math.abs(v.pos - args.position) < 50000).length,
      '50kb+': variants.filter(v => Math.abs(v.pos - args.position) >= 50000).length
    };

    output += `**Variant Density by Distance:**\n`;
    Object.entries(distanceBins).forEach(([bin, count]) => {
      output += `• ${bin}: ${count} variants\n`;
    });

    // Show nearby high-quality variants
    const nearbyVariants = variants
      .filter(v => Math.abs(v.pos - args.position) <= 50000)
      .filter(v => v.maf01) // Only common variants
      .sort((a, b) => Math.abs(a.pos - args.position) - Math.abs(b.pos - args.position))
      .slice(0, 10);

    if (nearbyVariants.length > 0) {
      output += `\n**Nearby Common Variants (MAF ≥1%, within 50kb):**\n`;
      nearbyVariants.forEach((variant, index) => {
        const distance = Math.abs(variant.pos - args.position);
        output += `${(index + 1).toString().padStart(2)}. **${variant.variantId}**\n`;
        output += `    • Distance: ${distance.toLocaleString()} bp\n`;
        output += `    • Alleles: ${variant.ref} → ${variant.alt}\n`;
        if (variant.snpId && variant.snpId !== 'nan') {
          output += `    • rsID: ${variant.snpId}\n`;
        }
      });
    }

    output += `\n**LD Analysis Notes:**\n`;
    output += `• This analysis identifies variants in the region for LD structure assessment\n`;
    output += `• True LD calculations require population genetics data (r² values)\n`;
    output += `• Consider using 1000 Genomes or gnomAD data for detailed LD analysis\n`;
    output += `• Variants with MAF ≥1% are generally suitable for LD calculations\n`;

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
    return tissueId.replace(/_/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());
  }
}
