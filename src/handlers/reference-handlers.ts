/**
 * GTEx Reference and Dataset Tool Handlers
 * Implements MCP tools for gene/variant lookups, tissue info, and sample metadata
 */

import { GTExApiClient } from '../utils/api-client.js';
import { GTEX_TISSUES, GTEX_DATASETS } from '../types/gtex-types.js';

export class ReferenceHandlers {
  private apiClient: GTExApiClient;

  constructor() {
    this.apiClient = new GTExApiClient();
  }

  /**
   * Search for genes by symbol, ID, or keyword
   */
  async searchGenes(args: any) {
    if (!args.query || typeof args.query !== 'string') {
      throw new Error('query parameter is required and must be a search string (gene symbol, GENCODE ID, or keyword)');
    }

    const result = await this.apiClient.searchGenes({
      geneId: args.query,
      gencodeVersion: args.gencodeVersion || 'v26',
      genomeBuild: args.genomeBuild || 'GRCh38/hg38',
      page: args.page || 0,
      itemsPerPage: args.itemsPerPage || 50
    });

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error searching genes: ${result.error}`
        }],
        isError: true
      };
    }

    const genes = result.data || [];
    if (genes.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No genes found matching query: "${args.query}"`
        }]
      };
    }

    let output = `**Gene Search Results for "${args.query}"**\n`;
    output += `Found ${genes.length} genes\n`;
    output += `Genome: ${genes[0]?.genomeBuild}, GENCODE: ${genes[0]?.gencodeVersion}\n\n`;

    genes.forEach((gene, index) => {
      output += `${(index + 1).toString().padStart(2)}. **${gene.geneSymbol}** (${gene.gencodeId})\n`;
      output += `    • Location: ${gene.chromosome}:${gene.start.toLocaleString()}-${gene.end.toLocaleString()} (${gene.strand})\n`;
      output += `    • Type: ${gene.geneType}\n`;
      output += `    • Status: ${gene.geneStatus}\n`;
      if (gene.description) {
        const truncatedDesc = gene.description.length > 80 
          ? gene.description.substring(0, 80) + '...' 
          : gene.description;
        output += `    • Description: ${truncatedDesc}\n`;
      }
      if (gene.entrezGeneId) {
        output += `    • Entrez ID: ${gene.entrezGeneId}\n`;
      }
      output += `    • TSS: ${gene.tss.toLocaleString()}\n`;
    });

    if (result.paging_info && result.paging_info.totalNumberOfItems > genes.length) {
      output += `\n**Note:** Showing ${genes.length} of ${result.paging_info.totalNumberOfItems} total results.\n`;
    }

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Get detailed gene information
   */
  async getGeneInfo(args: any) {
    if (!args.geneIds || !Array.isArray(args.geneIds) || args.geneIds.length === 0) {
      throw new Error('geneIds parameter is required and must be a non-empty array of gene IDs');
    }

    if (args.geneIds.length > 50) {
      return {
        content: [{
          type: "text",
          text: "Maximum 50 genes can be processed at once. Please reduce the number of genes."
        }]
      };
    }

    const result = await this.apiClient.getGenes(
      args.geneIds,
      args.gencodeVersion || 'v26',
      args.genomeBuild || 'GRCh38/hg38'
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving gene information: ${result.error}`
        }],
        isError: true
      };
    }

    const genes = result.data || [];
    if (genes.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No genes found for the specified IDs: ${args.geneIds.join(', ')}`
        }]
      };
    }

    let output = `**Gene Information (${genes.length} genes)**\n`;
    output += `Genome: ${genes[0]?.genomeBuild}, GENCODE: ${genes[0]?.gencodeVersion}\n\n`;

    genes.forEach((gene, index) => {
      output += `### ${index + 1}. ${gene.geneSymbol} (${gene.gencodeId})\n`;
      output += `**Genomic Location:**\n`;
      output += `  • Chromosome: ${gene.chromosome}\n`;
      output += `  • Position: ${gene.start.toLocaleString()} - ${gene.end.toLocaleString()}\n`;
      output += `  • Strand: ${gene.strand}\n`;
      output += `  • Length: ${(gene.end - gene.start + 1).toLocaleString()} bp\n`;
      output += `  • TSS: ${gene.tss.toLocaleString()}\n\n`;

      output += `**Gene Annotation:**\n`;
      output += `  • Type: ${gene.geneType}\n`;
      output += `  • Status: ${gene.geneStatus}\n`;
      output += `  • Source: ${gene.dataSource}\n`;
      if (gene.entrezGeneId) {
        output += `  • Entrez Gene ID: ${gene.entrezGeneId}\n`;
      }
      
      if (gene.description) {
        output += `\n**Description:**\n${gene.description}\n`;
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
   * Get transcripts for genes
   */
  async getTranscripts(args: any) {
    if (!args.geneId || typeof args.geneId !== 'string') {
      throw new Error('geneId parameter is required and must be a GENCODE gene ID');
    }

    const result = await this.apiClient.getTranscripts(
      args.geneId,
      args.gencodeVersion || 'v26',
      args.genomeBuild || 'GRCh38/hg38'
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving transcripts: ${result.error}`
        }],
        isError: true
      };
    }

    const transcripts = result.data || [];
    if (transcripts.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No transcripts found for gene: ${args.geneId}`
        }]
      };
    }

    let output = `**Transcripts for ${transcripts[0]?.geneSymbol} (${args.geneId})**\n`;
    output += `Found ${transcripts.length} transcripts\n`;
    output += `Genome: ${transcripts[0]?.genomeBuild}, GENCODE: ${transcripts[0]?.gencodeVersion}\n\n`;

    // Sort transcripts by start position
    const sortedTranscripts = transcripts.sort((a, b) => a.start - b.start);

    sortedTranscripts.forEach((transcript, index) => {
      output += `${(index + 1).toString().padStart(2)}. **${transcript.transcriptId}**\n`;
      output += `    • Location: ${transcript.chromosome}:${transcript.start.toLocaleString()}-${transcript.end.toLocaleString()} (${transcript.strand})\n`;
      output += `    • Length: ${(transcript.end - transcript.start + 1).toLocaleString()} bp\n`;
      output += `    • Type: ${transcript.featureType}\n`;
      output += `    • Source: ${transcript.source}\n`;
    });

    // Calculate gene span and summary
    const geneStart = Math.min(...sortedTranscripts.map(t => t.start));
    const geneEnd = Math.max(...sortedTranscripts.map(t => t.end));
    const geneLengths = sortedTranscripts.map(t => t.end - t.start + 1);
    const avgLength = geneLengths.reduce((sum, len) => sum + len, 0) / geneLengths.length;

    output += `\n**Gene Summary:**\n`;
    output += `  • Gene span: ${(geneEnd - geneStart + 1).toLocaleString()} bp\n`;
    output += `  • Total transcripts: ${transcripts.length}\n`;
    output += `  • Average transcript length: ${Math.round(avgLength).toLocaleString()} bp\n`;
    output += `  • Longest transcript: ${Math.max(...geneLengths).toLocaleString()} bp\n`;
    output += `  • Shortest transcript: ${Math.min(...geneLengths).toLocaleString()} bp\n`;

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Get neighboring genes around a genomic position
   */
  async getNeighborGenes(args: any) {
    if (!args.chromosome || !args.position || !args.window) {
      throw new Error('chromosome, position, and window parameters are all required');
    }

    if (typeof args.position !== 'number' || typeof args.window !== 'number') {
      throw new Error('position and window must be numbers');
    }

    const result = await this.apiClient.getNeighborGenes(
      args.chromosome,
      args.position,
      args.window,
      args.gencodeVersion || 'v26',
      args.genomeBuild || 'GRCh38/hg38'
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving neighboring genes: ${result.error}`
        }],
        isError: true
      };
    }

    const genes = result.data || [];
    if (genes.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No genes found near ${args.chromosome}:${args.position.toLocaleString()} ±${args.window.toLocaleString()} bp`
        }]
      };
    }

    const regionStart = args.position - args.window;
    const regionEnd = args.position + args.window;

    let output = `**Neighboring Genes**\n`;
    output += `Region: ${args.chromosome}:${regionStart.toLocaleString()}-${regionEnd.toLocaleString()}\n`;
    output += `Center: ${args.chromosome}:${args.position.toLocaleString()}\n`;
    output += `Window: ±${args.window.toLocaleString()} bp\n`;
    output += `Found: ${genes.length} genes\n\n`;

    // Sort genes by distance from query position
    const genesWithDistance = genes.map(gene => {
      const geneCenter = (gene.start + gene.end) / 2;
      const distance = Math.abs(geneCenter - args.position);
      return { ...gene, distance };
    }).sort((a, b) => a.distance - b.distance);

    genesWithDistance.forEach((gene, index) => {
      const distanceKb = gene.distance / 1000;
      output += `${(index + 1).toString().padStart(2)}. **${gene.geneSymbol}** (${gene.gencodeId})\n`;
      output += `    • Location: ${gene.chromosome}:${gene.start.toLocaleString()}-${gene.end.toLocaleString()} (${gene.strand})\n`;
      output += `    • Distance from query: ${distanceKb.toFixed(1)} kb\n`;
      output += `    • Type: ${gene.geneType}\n`;
      if (gene.description) {
        const truncatedDesc = gene.description.length > 60 
          ? gene.description.substring(0, 60) + '...' 
          : gene.description;
        output += `    • Description: ${truncatedDesc}\n`;
      }
    });

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Get variant information
   */
  async getVariants(args: any) {
    if (!args.snpId && !args.variantId && !args.chromosome) {
      throw new Error('At least one of snpId, variantId, or chromosome must be provided');
    }

    const result = await this.apiClient.getVariants({
      snpId: args.snpId,
      variantId: args.variantId,
      datasetId: args.datasetId || 'gtex_v8',
      chromosome: args.chromosome,
      pos: args.positions ? (Array.isArray(args.positions) ? args.positions : [args.positions]) : undefined,
      page: args.page || 0,
      itemsPerPage: args.itemsPerPage || 250
    });

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving variant information: ${result.error}`
        }],
        isError: true
      };
    }

    const variants = result.data || [];
    if (variants.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No variants found matching the specified criteria."
        }]
      };
    }

    let output = `**Variant Information (${variants.length} variants)**\n`;
    output += `Dataset: ${variants[0]?.datasetId}\n\n`;

    variants.forEach((variant, index) => {
      output += `### ${index + 1}. ${variant.variantId}\n`;
      output += `**Genomic Information:**\n`;
      output += `  • Position: ${variant.chromosome}:${variant.pos.toLocaleString()}\n`;
      output += `  • Alleles: ${variant.ref} → ${variant.alt}\n`;
      if (variant.snpId && variant.snpId !== 'nan') {
        output += `  • dbSNP ID: ${variant.snpId}\n`;
      }
      if (variant.b37VariantId) {
        output += `  • GRCh37 ID: ${variant.b37VariantId}\n`;
      }
      
      output += `\n**Population Genetics:**\n`;
      output += `  • MAF ≥1%: ${variant.maf01 ? 'Yes' : 'No'}\n`;
      
      if (variant.shorthand) {
        output += `  • Shorthand: ${variant.shorthand}\n`;
      }
      output += '\n';
    });

    if (result.paging_info && result.paging_info.totalNumberOfItems > variants.length) {
      output += `**Note:** Showing ${variants.length} of ${result.paging_info.totalNumberOfItems} total results.\n`;
    }

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Get GTEx service information
   */
  async getServiceInfo(args: any) {
    const result = await this.apiClient.getServiceInfo();

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving service information: ${result.error}`
        }],
        isError: true
      };
    }

    const info = result.data;
    if (!info) {
      return {
        content: [{
          type: "text",
          text: "No service information available."
        }]
      };
    }

    let output = `**GTEx Portal API Service Information**\n\n`;
    output += `**Service Details:**\n`;
    output += `  • ID: ${info.id}\n`;
    output += `  • Name: ${info.name}\n`;
    output += `  • Version: ${info.version}\n`;
    output += `  • Environment: ${info.environment}\n\n`;

    if (info.organization) {
      output += `**Organization:**\n`;
      output += `  • Name: ${info.organization.name}\n`;
      output += `  • URL: ${info.organization.url}\n\n`;
    }

    output += `**Resources:**\n`;
    if (info.description) {
      output += `  • Description: ${info.description}\n`;
    }
    if (info.contactUrl) {
      output += `  • Contact: ${info.contactUrl}\n`;
    }
    if (info.documentationUrl) {
      output += `  • Documentation: ${info.documentationUrl}\n`;
    }

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Get dataset information
   */
  async getDatasetInfo(args: any) {
    const result = await this.apiClient.getDatasetInfo(args.datasetId);

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving dataset information: ${result.error}`
        }],
        isError: true
      };
    }

    const datasets = result.data || [];
    if (datasets.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No dataset information available."
        }]
      };
    }

    let output = `**GTEx Dataset Information**\n\n`;

    datasets.forEach((dataset, index) => {
      if (datasets.length > 1) {
        output += `### Dataset ${index + 1}: ${dataset.datasetId}\n`;
      }
      
      output += `**Basic Information:**\n`;
      output += `  • ID: ${dataset.datasetId}\n`;
      output += `  • Display Name: ${dataset.displayName}\n`;
      output += `  • Organization: ${dataset.organization}\n`;
      if (dataset.description) {
        output += `  • Description: ${dataset.description}\n`;
      }
      if (dataset.dbgapId) {
        output += `  • dbGaP ID: ${dataset.dbgapId}\n`;
      }

      output += `\n**Genomic References:**\n`;
      output += `  • Genome Build: ${dataset.genomeBuild}\n`;
      output += `  • GENCODE Version: ${dataset.gencodeVersion}\n`;
      if (dataset.dbSnpBuild) {
        output += `  • dbSNP Build: ${dataset.dbSnpBuild}\n`;
      }

      output += `\n**Sample Statistics:**\n`;
      output += `  • Total subjects: ${dataset.subjectCount.toLocaleString()}\n`;
      output += `  • Total tissues: ${dataset.tissueCount}\n`;
      output += `  • RNA-seq samples: ${dataset.rnaSeqSampleCount.toLocaleString()}\n`;
      output += `  • RNA-seq + genotype samples: ${dataset.rnaSeqAndGenotypeSampleCount.toLocaleString()}\n`;

      output += `\n**QTL Analysis:**\n`;
      output += `  • eQTL subjects: ${dataset.eqtlSubjectCount.toLocaleString()}\n`;
      output += `  • eQTL tissues: ${dataset.eqtlTissuesCount}\n`;

      if (datasets.length > 1 && index < datasets.length - 1) {
        output += '\n';
      }
    });

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Get tissue site details
   */
  async getTissueInfo(args: any) {
    const result = await this.apiClient.getTissueSiteDetails(args.datasetId || 'gtex_v8');

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving tissue information: ${result.error}`
        }],
        isError: true
      };
    }

    const tissues = result.data || [];
    if (tissues.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No tissue information available."
        }]
      };
    }

    let output = `**GTEx Tissue Information**\n`;
    output += `Dataset: ${tissues[0]?.datasetId}\n`;
    output += `Total tissues: ${tissues.length}\n\n`;

    // Filter tissues if specific ones requested
    let displayTissues = tissues;
    if (args.tissueIds && Array.isArray(args.tissueIds)) {
      displayTissues = tissues.filter(t => args.tissueIds.includes(t.tissueSiteDetailId));
      if (displayTissues.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No tissues found matching: ${args.tissueIds.join(', ')}`
          }]
        };
      }
    }

    // Sort by tissue name
    const sortedTissues = displayTissues.sort((a, b) => a.tissueSiteDetail.localeCompare(b.tissueSiteDetail));

    sortedTissues.forEach((tissue, index) => {
      if (displayTissues.length === 1) {
        output += `### ${tissue.tissueSiteDetail}\n`;
      } else {
        output += `${(index + 1).toString().padStart(2)}. **${tissue.tissueSiteDetail}** (${tissue.tissueSiteDetailId})\n`;
      }

      if (displayTissues.length === 1) {
        output += `**Identifiers:**\n`;
        output += `  • Tissue ID: ${tissue.tissueSiteDetailId}\n`;
        output += `  • Abbreviation: ${tissue.tissueSiteDetailAbbr}\n`;
        output += `  • Sampling Site: ${tissue.samplingSite}\n`;
        output += `  • Ontology ID: ${tissue.ontologyId}\n`;
        if (tissue.ontologyIri) {
          output += `  • Ontology IRI: ${tissue.ontologyIri}\n`;
        }

        output += `\n**Visual Properties:**\n`;
        output += `  • Color (hex): ${tissue.colorHex}\n`;
        output += `  • Color (RGB): ${tissue.colorRgb}\n`;

        output += `\n**Data Availability:**\n`;
        output += `  • Has eGenes: ${tissue.hasEGenes ? 'Yes' : 'No'}\n`;
        output += `  • Has sGenes: ${tissue.hasSGenes ? 'Yes' : 'No'}\n`;
        output += `  • Mapped in HubMAP: ${tissue.mappedInHubmap ? 'Yes' : 'No'}\n`;

        if (tissue.hasEGenes) {
          output += `  • eGene count: ${tissue.eGeneCount.toLocaleString()}\n`;
        }
        if (tissue.hasSGenes) {
          output += `  • sGene count: ${tissue.sGeneCount.toLocaleString()}\n`;
        }
        output += `  • Expressed genes: ${tissue.expressedGeneCount.toLocaleString()}\n`;

        // RNA-seq samples
        const rnaSamples = tissue.rnaSeqSampleSummary;
        output += `\n**RNA-seq Samples:**\n`;
        output += `  • Total: ${rnaSamples.totalCount}\n`;
        output += `  • Female: ${rnaSamples.female.count} (age: ${rnaSamples.female.ageMin}-${rnaSamples.female.ageMax}, mean: ${rnaSamples.female.ageMean.toFixed(1)})\n`;
        output += `  • Male: ${rnaSamples.male.count} (age: ${rnaSamples.male.ageMin}-${rnaSamples.male.ageMax}, mean: ${rnaSamples.male.ageMean.toFixed(1)})\n`;

        // eQTL samples
        const eqtlSamples = tissue.eqtlSampleSummary;
        output += `\n**eQTL Samples:**\n`;
        output += `  • Total: ${eqtlSamples.totalCount}\n`;
        output += `  • Female: ${eqtlSamples.female.count} (age: ${eqtlSamples.female.ageMin}-${eqtlSamples.female.ageMax}, mean: ${eqtlSamples.female.ageMean.toFixed(1)})\n`;
        output += `  • Male: ${eqtlSamples.male.count} (age: ${eqtlSamples.male.ageMin}-${eqtlSamples.male.ageMax}, mean: ${eqtlSamples.male.ageMean.toFixed(1)})\n`;

      } else {
        // Brief format for multiple tissues
        const totalSamples = tissue.rnaSeqSampleSummary.totalCount;
        const eGeneInfo = tissue.hasEGenes ? `, ${tissue.eGeneCount} eGenes` : '';
        const sGeneInfo = tissue.hasSGenes ? `, ${tissue.sGeneCount} sGenes` : '';
        output += `    ${totalSamples} samples${eGeneInfo}${sGeneInfo}\n`;
      }
    });

    if (displayTissues.length > 1) {
      // Summary statistics
      const totalSamples = displayTissues.reduce((sum, t) => sum + t.rnaSeqSampleSummary.totalCount, 0);
      const totalEGenes = displayTissues.reduce((sum, t) => sum + (t.hasEGenes ? t.eGeneCount : 0), 0);
      const totalSGenes = displayTissues.reduce((sum, t) => sum + (t.hasSGenes ? t.sGeneCount : 0), 0);

      output += `\n**Summary:**\n`;
      output += `  • Total RNA-seq samples: ${totalSamples.toLocaleString()}\n`;
      output += `  • Total eGenes: ${totalEGenes.toLocaleString()}\n`;
      output += `  • Total sGenes: ${totalSGenes.toLocaleString()}\n`;
      output += `  • Tissues with eQTL data: ${displayTissues.filter(t => t.hasEGenes).length}\n`;
      output += `  • Tissues with sQTL data: ${displayTissues.filter(t => t.hasSGenes).length}\n`;
    }

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Get sample information
   */
  async getSamples(args: any) {
    const result = await this.apiClient.getSamples({
      datasetId: args.datasetId || 'gtex_v8',
      sampleId: args.sampleIds,
      tissueSampleId: args.tissueSampleIds,
      subjectId: args.subjectIds,
      ageBracket: args.ageBrackets,
      sex: args.sex,
      pathCategory: args.pathCategories,
      tissueSiteDetailId: args.tissueIds,
      page: args.page || 0,
      itemsPerPage: args.itemsPerPage || 100
    });

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving sample information: ${result.error}`
        }],
        isError: true
      };
    }

    const samples = result.data || [];
    if (samples.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No samples found matching the specified criteria."
        }]
      };
    }

    let output = `**Sample Information (${samples.length} samples)**\n`;
    output += `Dataset: ${samples[0]?.datasetId}\n\n`;

    if (samples.length <= 20) {
      // Detailed view for small result sets
      samples.forEach((sample, index) => {
        output += `### Sample ${index + 1}: ${sample.sampleId}\n`;
        output += `**Subject Information:**\n`;
        output += `  • Subject ID: ${sample.subjectId}\n`;
        output += `  • Age bracket: ${sample.ageBracket}\n`;
        output += `  • Sex: ${sample.sex}\n`;
        output += `  • Hardy Scale: ${sample.hardyScale}\n`;

        output += `\n**Sample Details:**\n`;
        output += `  • Tissue sample ID: ${sample.tissueSampleId}\n`;
        output += `  • Tissue: ${sample.tissueSiteDetail} (${sample.tissueSiteDetailId})\n`;
        if (sample.aliquotId) {
          output += `  • Aliquot ID: ${sample.aliquotId}\n`;
        }
        output += `  • Data type: ${sample.dataType}\n`;

        if (sample.ischemicTime !== undefined) {
          output += `\n**Sample Quality:**\n`;
          output += `  • Ischemic time: ${sample.ischemicTime} min (${sample.ischemicTimeGroup})\n`;
          if (sample.rin !== undefined) {
            output += `  • RIN: ${sample.rin}\n`;
          }
          if (sample.autolysisScore) {
            output += `  • Autolysis score: ${sample.autolysisScore}\n`;
          }
        }

        if (sample.pathologyNotes) {
          output += `\n**Pathology Notes:** ${sample.pathologyNotes}\n`;
        }
        output += '\n';
      });
    } else {
      // Summary view for large result sets
      const tissueGroups: { [key: string]: any[] } = {};
      samples.forEach(sample => {
        if (!tissueGroups[sample.tissueSiteDetailId]) {
          tissueGroups[sample.tissueSiteDetailId] = [];
        }
        tissueGroups[sample.tissueSiteDetailId].push(sample);
      });

      output += `**Sample Summary by Tissue:**\n`;
      Object.entries(tissueGroups).forEach(([tissueId, tissueSamples]) => {
        const tissueDisplayName = this.getTissueDisplayName(tissueId);
        const maleCount = tissueSamples.filter(s => s.sex === 'male').length;
        const femaleCount = tissueSamples.filter(s => s.sex === 'female').length;
        const avgAge = this.calculateAverageAge(tissueSamples);
        
        output += `  **${tissueDisplayName}** (${tissueSamples.length} samples)\n`;
        output += `    • Male: ${maleCount}, Female: ${femaleCount}\n`;
        if (avgAge) {
          output += `    • Average age: ${avgAge}\n`;
        }
      });
    }

    if (result.paging_info && result.paging_info.totalNumberOfItems > samples.length) {
      output += `\n**Note:** Showing ${samples.length} of ${result.paging_info.totalNumberOfItems} total results.\n`;
    }

    return {
      content: [{
        type: "text",
        text: output.trim()
      }]
    };
  }

  /**
   * Get subject information
   */
  async getSubjects(args: any) {
    const result = await this.apiClient.getSubjects(
      args.datasetId || 'gtex_v8',
      args.sex,
      args.ageBrackets,
      args.hardyScale,
      args.subjectIds
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving subject information: ${result.error}`
        }],
        isError: true
      };
    }

    const subjects = result.data || [];
    if (subjects.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No subjects found matching the specified criteria."
        }]
      };
    }

    let output = `**Subject Information (${subjects.length} subjects)**\n`;
    output += `Dataset: ${subjects[0]?.datasetId}\n\n`;

    if (subjects.length <= 50) {
      // Detailed view for smaller result sets
      subjects.forEach((subject, index) => {
        output += `${(index + 1).toString().padStart(3)}. **${subject.subjectId}**\n`;
        output += `     • Age: ${subject.ageBracket}\n`;
        output += `     • Sex: ${subject.sex}\n`;
        output += `     • Hardy Scale: ${subject.hardyScale}\n`;
      });
    } else {
      // Summary view for large result sets
      const sexGroups = this.groupBy(subjects, 'sex');
      const ageGroups = this.groupBy(subjects, 'ageBracket');
      const hardyGroups = this.groupBy(subjects, 'hardyScale');

      output += `**Demographics Summary:**\n`;
      output += `• **By Sex:**\n`;
      Object.entries(sexGroups).forEach(([sex, count]) => {
        output += `  - ${sex}: ${count} subjects (${((count / subjects.length) * 100).toFixed(1)}%)\n`;
      });

      output += `• **By Age Bracket:**\n`;
      Object.entries(ageGroups).forEach(([age, count]) => {
        output += `  - ${age} years: ${count} subjects (${((count / subjects.length) * 100).toFixed(1)}%)\n`;
      });

      output += `• **By Hardy Scale:**\n`;
      Object.entries(hardyGroups).forEach(([hardy, count]) => {
        output += `  - ${hardy}: ${count} subjects (${((count / subjects.length) * 100).toFixed(1)}%)\n`;
      });
    }

    if (result.paging_info && result.paging_info.totalNumberOfItems > subjects.length) {
      output += `\n**Note:** Showing ${subjects.length} of ${result.paging_info.totalNumberOfItems} total results.\n`;
    }

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Get biobank sample information
   */
  async getBiobankSamples(args: any) {
    const result = await this.apiClient.getBiobankSamples(
      args.materialTypes,
      args.tissueIds,
      args.pathCategories,
      args.sex,
      args.ageBrackets
    );

    if (result.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving biobank samples: ${result.error}`
        }],
        isError: true
      };
    }

    const samples = result.data || [];
    if (samples.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No biobank samples found matching the specified criteria."
        }]
      };
    }

    let output = `**Biobank Sample Information (${samples.length} samples)**\n\n`;

    // Group by material type
    const materialGroups: { [key: string]: any[] } = {};
    samples.forEach(sample => {
      if (!materialGroups[sample.materialType]) {
        materialGroups[sample.materialType] = [];
      }
      materialGroups[sample.materialType].push(sample);
    });

    output += `**Summary by Material Type:**\n`;
    Object.entries(materialGroups).forEach(([materialType, materialSamples]) => {
      const availableCount = materialSamples.filter(s => s.hasExpressionData || s.hasGenotype).length;
      output += `• **${materialType}**: ${materialSamples.length} samples (${availableCount} with expression/genotype data)\n`;
    });

    // Show details for smaller result sets
    if (samples.length <= 20) {
      output += `\n**Sample Details:**\n`;
      samples.slice(0, 20).forEach((sample, index) => {
        output += `\n${index + 1}. **${sample.sampleId}**\n`;
        output += `   • Subject: ${sample.subjectId}\n`;
        output += `   • Material: ${sample.materialType}\n`;
        output += `   • Tissue: ${sample.tissueSiteDetail} (${sample.tissueSiteDetailId})\n`;
        output += `   • Sex: ${sample.sex}, Age: ${sample.ageBracket}\n`;
        if (sample.rin) {
          output += `   • RIN: ${sample.rin}\n`;
        }
        if (sample.concentration) {
          output += `   • Concentration: ${sample.concentration}\n`;
        }
        output += `   • Expression data: ${sample.hasExpressionData ? 'Yes' : 'No'}\n`;
        output += `   • Genotype data: ${sample.hasGenotype ? 'Yes' : 'No'}\n`;
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
   * Validate gene or variant IDs
   */
  async validateIds(args: any) {
    if (!args.ids || !Array.isArray(args.ids) || args.ids.length === 0) {
      throw new Error('ids parameter is required and must be a non-empty array of IDs to validate');
    }

    const idType = args.type || 'gene'; // 'gene' or 'variant'
    
    if (idType === 'gene') {
      return await this.validateGeneIds(args.ids);
    } else if (idType === 'variant') {
      return await this.validateVariantIds(args.ids);
    } else {
      throw new Error('type parameter must be either "gene" or "variant"');
    }
  }

  /**
   * Validate gene IDs
   */
  private async validateGeneIds(geneIds: string[]) {
    const validGenes: string[] = [];
    const invalidGenes: string[] = [];

    // Try to get information for all gene IDs
    const result = await this.apiClient.getGenes(geneIds, 'v26', 'GRCh38/hg38');
    
    if (!result.error && result.data) {
      const foundGenes = result.data.map(gene => gene.gencodeId || gene.geneSymbol);
      
      geneIds.forEach(id => {
        if (foundGenes.some(foundId => foundId.toLowerCase() === id.toLowerCase())) {
          validGenes.push(id);
        } else {
          invalidGenes.push(id);
        }
      });
    } else {
      // If API call fails, mark all as invalid
      invalidGenes.push(...geneIds);
    }

    let output = `**Gene ID Validation Results**\n`;
    output += `Checked: ${geneIds.length} gene IDs\n\n`;

    if (validGenes.length > 0) {
      output += `**✅ Valid Gene IDs (${validGenes.length}):**\n`;
      validGenes.forEach(id => {
        output += `  • ${id}\n`;
      });
    }

    if (invalidGenes.length > 0) {
      output += `\n**❌ Invalid Gene IDs (${invalidGenes.length}):**\n`;
      invalidGenes.forEach(id => {
        output += `  • ${id}\n`;
      });
      output += `\n**Note:** Invalid IDs may be due to incorrect format, obsolete IDs, or typos.\n`;
    }

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Validate variant IDs
   */
  private async validateVariantIds(variantIds: string[]) {
    const validVariants: string[] = [];
    const invalidVariants: string[] = [];

    // Check each variant ID individually
    for (const variantId of variantIds) {
      const result = await this.apiClient.getVariants({
        variantId: variantId,
        datasetId: 'gtex_v8',
        page: 0,
        itemsPerPage: 1
      });

      if (!result.error && result.data && result.data.length > 0) {
        validVariants.push(variantId);
      } else {
        invalidVariants.push(variantId);
      }
    }

    let output = `**Variant ID Validation Results**\n`;
    output += `Checked: ${variantIds.length} variant IDs\n\n`;

    if (validVariants.length > 0) {
      output += `**✅ Valid Variant IDs (${validVariants.length}):**\n`;
      validVariants.forEach(id => {
        output += `  • ${id}\n`;
      });
    }

    if (invalidVariants.length > 0) {
      output += `\n**❌ Invalid Variant IDs (${invalidVariants.length}):**\n`;
      invalidVariants.forEach(id => {
        output += `  • ${id}\n`;
      });
      output += `\n**Note:** Invalid IDs may be due to incorrect format or variants not present in the GTEx dataset.\n`;
    }

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

  /**
   * Helper function to calculate average age from samples
   */
  private calculateAverageAge(samples: any[]): string | null {
    const ageBrackets = samples.map(s => s.ageBracket).filter(Boolean);
    if (ageBrackets.length === 0) return null;

    // Convert age brackets to midpoints for averaging
    const ageMidpoints = ageBrackets.map(bracket => {
      const match = bracket.match(/(\d+)-(\d+)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        return (min + max) / 2;
      }
      return null;
    }).filter(age => age !== null) as number[];

    if (ageMidpoints.length === 0) return null;

    const avgAge = ageMidpoints.reduce((sum, age) => sum + age, 0) / ageMidpoints.length;
    return `${avgAge.toFixed(1)} years`;
  }

  /**
   * Get Gene Ontology annotations for a gene
   */
  async getGeneOntology(args: any) {
    if (!args.geneId || typeof args.geneId !== 'string') {
      throw new Error('geneId parameter is required and must be a GENCODE gene ID');
    }

    // First get gene information to validate the gene exists
    const geneResult = await this.apiClient.getGenes(
      [args.geneId],
      'v26',
      'GRCh38/hg38'
    );

    if (geneResult.error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving gene information for GO annotation: ${geneResult.error}`
        }],
        isError: true
      };
    }

    const genes = geneResult.data || [];
    if (genes.length === 0) {
      return {
        content: [{
          type: "text",
          text: `Gene not found: ${args.geneId}. Please check that this is a valid GENCODE gene ID.`
        }]
      };
    }

    const gene = genes[0];
    
    // Note: GTEx API doesn't directly provide GO annotations
    // This is a simplified implementation that provides basic gene information
    // In a real implementation, this would integrate with GO databases
    
    let output = `**Gene Ontology Information**\n`;
    output += `Gene: **${gene.geneSymbol}** (${gene.gencodeId})\n`;
    output += `Location: ${gene.chromosome}:${gene.start.toLocaleString()}-${gene.end.toLocaleString()}\n`;
    output += `Gene Type: ${gene.geneType}\n`;
    if (gene.description) {
      output += `Description: ${gene.description}\n`;
    }
    output += '\n';

    // Provide mock GO categories based on gene type and name
    output += `**Gene Ontology Categories:**\n`;
    
    if (args.ontologyType) {
      output += `Filtered by: ${args.ontologyType}\n`;
    }
    
    // Basic categorization based on gene information
    const biologicalProcesses = this.inferBiologicalProcesses(gene);
    const cellularComponents = this.inferCellularComponents(gene);
    const molecularFunctions = this.inferMolecularFunctions(gene);
    
    if (!args.ontologyType || args.ontologyType === 'biological_process') {
      output += `\n**Biological Process:**\n`;
      biologicalProcesses.forEach((process, index) => {
        output += `  ${index + 1}. ${process}\n`;
      });
    }
    
    if (!args.ontologyType || args.ontologyType === 'cellular_component') {
      output += `\n**Cellular Component:**\n`;
      cellularComponents.forEach((component, index) => {
        output += `  ${index + 1}. ${component}\n`;
      });
    }
    
    if (!args.ontologyType || args.ontologyType === 'molecular_function') {
      output += `\n**Molecular Function:**\n`;
      molecularFunctions.forEach((func, index) => {
        output += `  ${index + 1}. ${func}\n`;
      });
    }

    output += `\n**Note:** This is a simplified GO annotation based on gene characteristics. `;
    output += `For comprehensive GO annotations, please use dedicated GO databases like AmiGO, QuickGO, or the Gene Ontology Consortium website.\n`;
    
    if (gene.entrezGeneId) {
      output += `\n**External Resources:**\n`;
      output += `• Entrez Gene: https://www.ncbi.nlm.nih.gov/gene/${gene.entrezGeneId}\n`;
      output += `• AmiGO: http://amigo.geneontology.org/amigo/gene_product/UniProtKB:${gene.geneSymbol}\n`;
    }

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Convert between different genomic coordinate systems
   */
  async convertCoordinates(args: any) {
    if (!args.chr || !args.position) {
      throw new Error('chr and position parameters are required');
    }
    
    if (typeof args.position !== 'number') {
      throw new Error('position parameter must be a number');
    }

    const fromBuild = args.fromBuild || 'hg38';
    const toBuild = args.toBuild || 'hg19';
    
    // Validate genome builds
    const validBuilds = ['hg19', 'hg38'];
    if (!validBuilds.includes(fromBuild) || !validBuilds.includes(toBuild)) {
      throw new Error('Genome builds must be either "hg19" or "hg38"');
    }

    if (fromBuild === toBuild) {
      return {
        content: [{
          type: "text",
          text: `No conversion needed: ${args.chr}:${args.position.toLocaleString()} (${fromBuild} → ${toBuild})`
        }]
      };
    }

    let output = `**Genomic Coordinate Conversion**\n`;
    output += `Input: ${args.chr}:${args.position.toLocaleString()} (${fromBuild})\n`;
    output += `Target: ${toBuild}\n\n`;

    // Note: This is a simplified coordinate conversion
    // Real coordinate conversion requires liftOver tools or chain files
    
    // Provide approximate conversion based on known differences
    let convertedPosition = args.position;
    let conversionNote = '';
    
    if (fromBuild === 'hg19' && toBuild === 'hg38') {
      // Very rough approximation - real conversion needs liftOver
      // Most positions shift by small amounts, some by larger amounts
      const roughOffset = this.getApproximateHg19ToHg38Offset(args.chr, args.position);
      convertedPosition = args.position + roughOffset;
      conversionNote = 'hg19 to hg38 conversion (approximate)';
    } else if (fromBuild === 'hg38' && toBuild === 'hg19') {
      // Reverse conversion
      const roughOffset = this.getApproximateHg38ToHg19Offset(args.chr, args.position);
      convertedPosition = args.position + roughOffset;
      conversionNote = 'hg38 to hg19 conversion (approximate)';
    }

    output += `**Converted Coordinates:**\n`;
    output += `• **${toBuild}**: ${args.chr}:${convertedPosition.toLocaleString()}\n`;
    output += `• **Offset**: ${(convertedPosition - args.position).toLocaleString()} bp\n\n`;

    output += `**Conversion Details:**\n`;
    output += `• Method: ${conversionNote}\n`;
    output += `• Chromosome: ${args.chr}\n`;
    output += `• Region type: ${this.getRegionType(args.chr, args.position)}\n\n`;

    output += `**⚠️ Important Limitations:**\n`;
    output += `• This is an APPROXIMATE conversion for demonstration purposes\n`;
    output += `• Real coordinate conversion requires UCSC liftOver tools\n`;
    output += `• Some positions may not have direct equivalents between builds\n`;
    output += `• Insertions/deletions between builds can affect accuracy\n\n`;

    output += `**Recommended Tools for Accurate Conversion:**\n`;
    output += `• UCSC Genome Browser LiftOver: https://genome.ucsc.edu/cgi-bin/hgLiftOver\n`;
    output += `• Ensembl Assembly Converter: https://www.ensembl.org/Homo_sapiens/Tools/AssemblyConverter\n`;
    output += `• NCBI Remap: https://www.ncbi.nlm.nih.gov/genome/tools/remap\n`;

    return {
      content: [{
        type: "text",
        text: output
      }]
    };
  }

  /**
   * Helper function to infer biological processes from gene information
   */
  private inferBiologicalProcesses(gene: any): string[] {
    const processes = ['cellular process', 'metabolic process'];
    
    const description = gene.description?.toLowerCase() || '';
    const symbol = gene.geneSymbol?.toLowerCase() || '';
    
    if (description.includes('transcription') || symbol.includes('tf')) {
      processes.push('transcription, DNA-templated', 'regulation of gene expression');
    }
    if (description.includes('kinase') || symbol.includes('kinase')) {
      processes.push('protein phosphorylation', 'signal transduction');
    }
    if (description.includes('receptor') || symbol.includes('receptor')) {
      processes.push('cell surface receptor signaling pathway', 'response to stimulus');
    }
    if (description.includes('enzyme') || gene.geneType === 'protein_coding') {
      processes.push('catalytic activity', 'enzyme-mediated process');
    }
    
    return processes;
  }

  /**
   * Helper function to infer cellular components from gene information
   */
  private inferCellularComponents(gene: any): string[] {
    const components = ['cell', 'intracellular'];
    
    const description = gene.description?.toLowerCase() || '';
    const symbol = gene.geneSymbol?.toLowerCase() || '';
    
    if (description.includes('membrane') || description.includes('receptor')) {
      components.push('plasma membrane', 'integral component of membrane');
    }
    if (description.includes('nuclear') || description.includes('transcription')) {
      components.push('nucleus', 'nucleoplasm');
    }
    if (description.includes('mitochondrial') || symbol.startsWith('mt-')) {
      components.push('mitochondrion', 'mitochondrial matrix');
    }
    if (description.includes('cytoplasm') || gene.geneType === 'protein_coding') {
      components.push('cytoplasm', 'cytosol');
    }
    
    return components;
  }

  /**
   * Helper function to infer molecular functions from gene information
   */
  private inferMolecularFunctions(gene: any): string[] {
    const functions = ['binding'];
    
    const description = gene.description?.toLowerCase() || '';
    const symbol = gene.geneSymbol?.toLowerCase() || '';
    
    if (description.includes('kinase')) {
      functions.push('protein kinase activity', 'ATP binding');
    }
    if (description.includes('transcription') || symbol.includes('tf')) {
      functions.push('DNA-binding transcription factor activity', 'sequence-specific DNA binding');
    }
    if (description.includes('receptor')) {
      functions.push('receptor activity', 'ligand binding');
    }
    if (description.includes('enzyme') && gene.geneType === 'protein_coding') {
      functions.push('catalytic activity', 'hydrolase activity');
    }
    if (gene.geneType === 'protein_coding') {
      functions.push('protein binding');
    }
    
    return functions;
  }

  /**
   * Helper function to get approximate hg19 to hg38 offset
   */
  private getApproximateHg19ToHg38Offset(chr: string, position: number): number {
    // This is a very simplified approximation
    // Real conversion requires comprehensive chain files
    
    // Most positions have small positive offsets in hg38
    // This is just for demonstration purposes
    const baseOffset = Math.floor(position * 0.0001); // Very rough approximation
    
    // Some chromosomes have different patterns
    switch (chr.toLowerCase()) {
      case 'chr1': return baseOffset + 100;
      case 'chr2': return baseOffset - 50;
      case 'chrx': return baseOffset + 200;
      case 'chry': return baseOffset - 100;
      default: return baseOffset;
    }
  }

  /**
   * Helper function to get approximate hg38 to hg19 offset
   */
  private getApproximateHg38ToHg19Offset(chr: string, position: number): number {
    // Reverse of hg19 to hg38 conversion
    return -this.getApproximateHg19ToHg38Offset(chr, position);
  }

  /**
   * Helper function to determine region type
   */
  private getRegionType(chr: string, position: number): string {
    // Simple region classification
    if (chr.toLowerCase() === 'chry') {
      return 'Y chromosome';
    } else if (chr.toLowerCase() === 'chrx') {
      return 'X chromosome';
    } else if (chr.toLowerCase().includes('chr')) {
      const chrNum = parseInt(chr.replace('chr', ''));
      if (chrNum >= 1 && chrNum <= 22) {
        return `Autosomal chromosome ${chrNum}`;
      }
    }
    return 'Genomic region';
  }

  /**
   * Helper function to group array by property
   */
  private groupBy(array: any[], property: string): { [key: string]: number } {
    return array.reduce((groups, item) => {
      const key = item[property] || 'Unknown';
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {});
  }
}
