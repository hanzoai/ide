// Repeatable benchmark/profiler for workspace scanning, tree-sitter AST symbol
// extraction, call/type graph construction, and AST chunking.
//
// Usage:
//   cargo run --release -p hanzo-ai --example profile_workspace -- <workspace_path> [--iterations <N>]

use hanzo_ai::indexer::{chunker, index::CodeIndex, index_workspace, scanner};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Instant;

struct RunStats {
    scan_ms: f64,
    parse_ms: f64,
    graph_ms: f64,
    chunk_ms: f64,
    total_ms: f64,
    scanned_files: usize,
    skip_embedding_files: usize,
    total_bytes: u64,
    indexed_files: usize,
    symbols: usize,
    imports: usize,
    exports: usize,
    call_sites: usize,
    type_refs: usize,
    dep_edges: usize,
    cg_functions: usize,
    cg_edges: usize,
    tg_types: usize,
    tg_relations: usize,
    chunks: usize,
}

fn profile_once(root: &std::path::Path) -> (RunStats, Vec<(String, usize)>) {
    let t_total = Instant::now();

    let t_scan = Instant::now();
    let scanned = scanner::scan_workspace(root);
    let scan_ms = t_scan.elapsed().as_secs_f64() * 1000.0;

    let mut lang_counts: HashMap<String, usize> = HashMap::new();
    let mut skip_embedding_files = 0usize;
    let mut total_bytes = 0u64;
    for sf in &scanned {
        *lang_counts
            .entry(sf.language.label().to_string())
            .or_insert(0) += 1;
        if sf.skip_embedding {
            skip_embedding_files += 1;
        }
        total_bytes += sf.size;
    }
    let mut top_langs: Vec<(String, usize)> = lang_counts.into_iter().collect();
    top_langs.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));

    let t_parse = Instant::now();
    let project = index_workspace(root);
    let parse_ms = t_parse.elapsed().as_secs_f64() * 1000.0;

    let indexed_files = project.file_count();
    let symbols = project.symbol_count();
    let imports: usize = project.files.iter().map(|f| f.imports.len()).sum();
    let exports: usize = project.files.iter().map(|f| f.exports.len()).sum();
    let call_sites: usize = project.files.iter().map(|f| f.call_sites.len()).sum();
    let type_refs: usize = project.files.iter().map(|f| f.type_refs.len()).sum();
    let dep_edges: usize = project.dependency_graph.values().map(|v| v.len()).sum();

    let t_graph = Instant::now();
    let mut code_index = CodeIndex::new(root.to_string_lossy().into_owned(), project);
    let graph_ms = t_graph.elapsed().as_secs_f64() * 1000.0;

    let t_chunk = Instant::now();
    let chunks = chunker::chunk_project(&code_index.project, root);
    let chunk_count = chunks.len();
    code_index.add_chunks(chunks);
    let chunk_ms = t_chunk.elapsed().as_secs_f64() * 1000.0;

    let total_ms = t_total.elapsed().as_secs_f64() * 1000.0;

    let stats = RunStats {
        scan_ms,
        parse_ms,
        graph_ms,
        chunk_ms,
        total_ms,
        scanned_files: scanned.len(),
        skip_embedding_files,
        total_bytes,
        indexed_files,
        symbols,
        imports,
        exports,
        call_sites,
        type_refs,
        dep_edges,
        cg_functions: code_index.call_graph.function_count(),
        cg_edges: code_index.call_graph.edge_count(),
        tg_types: code_index.type_graph.type_count(),
        tg_relations: code_index.type_graph.relation_count(),
        chunks: code_index.chunk_count().max(chunk_count),
    };

    (stats, top_langs)
}

fn parse_args() -> Result<(PathBuf, usize), String> {
    let mut args = std::env::args().skip(1);
    let mut workspace: Option<PathBuf> = None;
    let mut iterations = 1usize;

    while let Some(arg) = args.next() {
        if arg == "--iterations" || arg == "-n" {
            let val = args
                .next()
                .ok_or_else(|| "missing value after --iterations".to_string())?;
            iterations = val
                .parse::<usize>()
                .map_err(|e| format!("invalid --iterations '{val}': {e}"))?;
            if iterations == 0 {
                return Err("--iterations must be >= 1".to_string());
            }
        } else if arg == "--help" || arg == "-h" {
            return Err(
                "Usage: profile_workspace <workspace_path> [--iterations <N>]".to_string(),
            );
        } else if workspace.is_none() {
            workspace = Some(PathBuf::from(arg));
        } else {
            return Err(format!("unexpected argument: {arg}"));
        }
    }

    let root = workspace.ok_or_else(|| {
        "Usage: profile_workspace <workspace_path> [--iterations <N>]".to_string()
    })?;
    if !root.is_dir() {
        return Err(format!("workspace path is not a directory: {}", root.display()));
    }
    Ok((root, iterations))
}

fn main() {
    let (root, iterations) = match parse_args() {
        Ok(parsed) => parsed,
        Err(msg) => {
            eprintln!("{msg}");
            std::process::exit(2);
        }
    };

    let mut runs = Vec::with_capacity(iterations);
    let mut top_langs = Vec::new();
    for i in 1..=iterations {
        let (stats, langs) = profile_once(&root);
        if i == 1 {
            top_langs = langs;
        }
        println!(
            "Run {i}/{iterations}: scan={:.1}ms index_workspace={:.1}ms graphs={:.1}ms chunk={:.1}ms total={:.1}ms",
            stats.scan_ms, stats.parse_ms, stats.graph_ms, stats.chunk_ms, stats.total_ms
        );
        runs.push(stats);
    }

    let first = &runs[0];
    let mb = first.total_bytes as f64 / (1024.0 * 1024.0);
    println!();
    println!("Workspace: {}", root.display());
    println!(
        "Scanned: {} parseable files ({:.2} MiB, {} skip_embedding >1MB)",
        first.scanned_files, mb, first.skip_embedding_files
    );
    println!(
        "AST Index: {} files, {} symbols, {} imports, {} exports, {} call_sites, {} type_refs, {} local_dep_edges",
        first.indexed_files,
        first.symbols,
        first.imports,
        first.exports,
        first.call_sites,
        first.type_refs,
        first.dep_edges
    );
    println!(
        "Graphs & Chunks: {} call_graph_fns, {} call_graph_edges, {} type_graph_types, {} type_relations, {} chunks",
        first.cg_functions, first.cg_edges, first.tg_types, first.tg_relations, first.chunks
    );

    let lang_summary: Vec<String> = top_langs
        .iter()
        .take(10)
        .map(|(lang, count)| format!("{lang}={count}"))
        .collect();
    println!("Top languages: {}", lang_summary.join(", "));
}
