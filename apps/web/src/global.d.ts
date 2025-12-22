/// <reference types="@cloudflare/workers-types" />

// Re-export Cloudflare Workers types to make them globally available
declare global {
	// This ensures D1Database, Ai, KVNamespace, etc. are available globally
	type D1Database = import('@cloudflare/workers-types').D1Database
	type Ai = import('@cloudflare/workers-types').Ai
	type KVNamespace = import('@cloudflare/workers-types').KVNamespace
	type KVNamespacePutOptions = import('@cloudflare/workers-types').KVNamespacePutOptions
	type KVNamespaceListOptions = import('@cloudflare/workers-types').KVNamespaceListOptions
	type R2Bucket = import('@cloudflare/workers-types').R2Bucket
	type R2PutOptions = import('@cloudflare/workers-types').R2PutOptions
	type R2ListOptions = import('@cloudflare/workers-types').R2ListOptions
	type VectorizeIndex = import('@cloudflare/workers-types').VectorizeIndex
	type VectorizeVector = import('@cloudflare/workers-types').VectorizeVector
	type VectorizeQueryOptions = import('@cloudflare/workers-types').VectorizeQueryOptions
	type VectorizeVectorMetadataFilter =
		import('@cloudflare/workers-types').VectorizeVectorMetadataFilter
}

export {}
