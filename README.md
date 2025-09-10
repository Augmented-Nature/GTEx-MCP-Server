# GTEx Portal MCP Server

A comprehensive Model Context Protocol (MCP) server providing access to the GTEx (Genotype-Tissue Expression) Portal API. This server enables AI assistants to query and analyze genomics data from the GTEx project through **25 specialized tools** across three categories.

## Overview

The GTEx Portal contains gene expression and regulatory data from 54 non-diseased tissue sites across nearly 1000 individuals. This MCP server provides structured access to:

- **Expression Analysis**: Gene expression patterns and tissue specificity (7 tools)
- **Association Analysis**: eQTL/sQTL analysis and genetic associations (6 tools)
- **Reference/Dataset**: Gene/variant lookups and metadata (12 tools)

## 🧬 Complete Tool Suite (25/25 Implemented)

### Expression Analysis Tools (7 tools)
- `get_gene_expression` - Get gene expression data across tissues for specific genes
- `get_median_gene_expression` - Get median gene expression levels across tissues
- `get_top_expressed_genes` - Get top expressed genes in specific tissues
- `get_tissue_specific_genes` - Get genes with tissue-specific expression patterns
- `get_clustered_expression` - Get clustered gene expression data for visualization
- `calculate_expression_correlation` - Calculate Pearson correlation between genes across tissues
- `get_differential_expression` - Get differential gene expression between tissue groups

### Association Analysis Tools (6 tools)
- `get_eqtl_genes` - Get genes with eQTL associations for genomic regions
- `get_single_tissue_eqtls` - Get single-tissue eQTL results for genes
- `calculate_dynamic_eqtl` - Calculate dynamic eQTL effects across tissues
- `get_multi_tissue_eqtls` - Get multi-tissue eQTL meta-analysis results
- `get_sqtl_results` - Get splicing QTL (sQTL) results for genes
- `analyze_ld_structure` - Analyze linkage disequilibrium structure around variants

### Reference/Dataset Tools (12 tools)
- `search_genes` - Search for genes by symbol, name, or description
- `get_gene_info` - Get detailed information about specific genes
- `get_variants` - Get genetic variants in genomic regions
- `get_tissue_info` - Get information about GTEx tissues and sample counts
- `get_sample_info` - Get GTEx sample metadata and demographics
- `get_subject_phenotypes` - Get subject phenotype data and demographics
- `validate_gene_id` - Validate and normalize gene identifiers
- `validate_variant_id` - Validate variant identifiers and genomic coordinates
- `get_dataset_info` - Get information about available GTEx datasets
- `search_transcripts` - Search for gene transcripts and isoforms
- `get_gene_ontology` - Get Gene Ontology annotations for genes
- `convert_coordinates` - Convert between genomic coordinate systems (hg19/hg38)

## 🚀 Installation

1. Clone or download the server files
2. Install dependencies:
```bash
cd gtex-server
npm install
```

3. Build the server:
```bash
npm run build
```

## Usage

### Running the Server

Start the server for testing:
```bash
npm run dev
```

Use the MCP inspector for development:
```bash
npm run inspector
```

### Integrating with Claude Desktop

Add the server to your Claude Desktop configuration file:

**On macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**On Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gtex-server": {
      "command": "node",
      "args": ["/path/to/gtex-server/build/index.js"]
    }
  }
}
```

Replace `/path/to/gtex-server` with the actual path to your server installation.

## 📊 Example Usage

### Search for Genes
```
Search for genes related to "BRCA1" or "insulin signaling"
```

### Gene Expression Analysis
```
Get median gene expression for ENSG00000012048.20 (BRCA1) across all tissues
```

### Tissue-Specific Analysis
```
Find tissue-specific genes in Brain_Cortex and compare with Muscle_Skeletal
```

### eQTL Analysis
```
Find genes with eQTL associations in genomic region chr17:43000000-43200000
```

### Expression Correlation
```
Calculate expression correlation between BRCA1 and BRCA2 across tissues
```

### Coordinate Conversion
```
Convert genomic coordinates from hg38 to hg19: chr1:1500000
```

## 🔬 Scientific Applications

This server enables comprehensive genomics research including:

- **Tissue Expression Profiling**: Identify genes with tissue-specific or tissue-enriched expression
- **Co-expression Analysis**: Find genes with correlated expression patterns
- **eQTL Mapping**: Discover expression quantitative trait loci and regulatory variants  
- **Comparative Genomics**: Compare expression across different tissue types
- **Functional Annotation**: Link genes to biological processes via Gene Ontology
- **Variant Analysis**: Explore genetic variation and its impact on gene expression

## 🗄️ API Data Source

This server connects to the GTEx Portal API v2:
- **Base URL**: https://gtexportal.org/api/v2/
- **Documentation**: https://gtexportal.org/api/v2/redoc
- **Data**: GTEx v8 dataset (15,201 RNA-Seq samples from 54 tissues, 948 donors)
- **Genome Build**: GRCh38/hg38

## 📋 Data Types and Formats

### Gene Identifiers
- **GENCODE IDs**: e.g., `ENSG00000012048.20` (BRCA1)
- **Gene Symbols**: e.g., `BRCA1`, `TP53`, `INSR`

### Tissue Identifiers  
- **Tissue Site Detail IDs**: e.g., `Muscle_Skeletal`, `Brain_Cortex`, `Heart_Left_Ventricle`
- Use `get_tissue_info` tool to see all 54 available tissues

### Genomic Coordinates
- **Chromosome**: e.g., `chr17`, `chrX`, `chrY`
- **Positions**: 1-based genomic coordinates
- **Genome Build**: GRCh38/hg38 (with hg19 conversion available)

### Expression Values
- **Units**: TPM (Transcripts Per Million)
- **Statistics**: Mean, median, standard deviation across samples
- **Detection**: Percentage of samples with detectable expression

## ⚡ Performance & Reliability

- **Error Handling**: Comprehensive validation and graceful error recovery
- **Rate Limiting**: Automatic handling of API rate limits
- **Timeouts**: 30-second timeouts with retry logic
- **Caching**: Intelligent caching to improve response times
- **Pagination**: Automatic handling of large result sets
- **Validation**: Input parameter validation and normalization

## 🛠️ Development

### Project Structure
```
gtex-server/
├── src/
│   ├── index.ts                      # Main MCP server with tool registration
│   ├── types/gtex-types.ts          # Complete TypeScript type definitions
│   ├── utils/api-client.ts          # GTEx API client with comprehensive methods
│   └── handlers/
│       ├── expression-handlers.ts    # 7 expression analysis tools
│       ├── association-handlers.ts   # 6 eQTL/sQTL analysis tools  
│       └── reference-handlers.ts     # 12 reference/lookup tools
├── build/                           # Compiled JavaScript output
├── test-complete-server.js         # Comprehensive testing script
├── package.json                     # Dependencies and build scripts
└── tsconfig.json                    # TypeScript configuration
```

### Development Commands
```bash
# Build the project
npm run build

# Run in development mode with auto-reload
npm run dev

# Watch for changes during development
npm run watch

# Test all 25 tools
node test-complete-server.js
```

### Technical Implementation

- **Language**: TypeScript with ES modules
- **Framework**: Model Context Protocol SDK v0.6.0
- **Architecture**: Modular design with separate handler classes
- **API Client**: Axios with comprehensive error handling
- **Data Processing**: Statistical analysis and data formatting
- **Type Safety**: Complete type definitions for all GTEx API responses

## 📚 References

- [GTEx Portal](https://gtexportal.org/) - Main GTEx data portal
- [GTEx API Documentation](https://gtexportal.org/api/v2/redoc) - Complete API reference
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [GTEx Consortium Nature Paper](https://www.nature.com/articles/s41588-017-0004-9) - Primary publication
- [GTEx Analysis Methods](https://www.gtexportal.org/home/documentationPage#staticTextAnalysisMethods) - Statistical methods

## 🎯 Status: Production Ready

✅ **All 25 tools implemented and tested**  
✅ **Complete TypeScript implementation**  
✅ **Comprehensive error handling**  
✅ **Live GTEx Portal API integration**  
✅ **MCP 1.0 compliant**  
✅ **Ready for genomics research**

## 📄 License

MIT License - Feel free to use, modify, and distribute for research and commercial applications.

---

*This server bridges the GTEx Portal's extensive genomics database with the Model Context Protocol, enabling powerful genomics analysis through AI assistants.*
