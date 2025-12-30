/**
 * Slug Generation Utility
 *
 * Provides URL-safe slug generation from names/titles.
 */

// =============================================================================
// Types
// =============================================================================

export interface GenerateUniqueSlugOptions {
	/** The original name to convert */
	name: string
	/** Async function to check if a slug already exists */
	checkExists: (slug: string) => Promise<boolean>
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert a name to a URL-safe slug.
 *
 * @example
 * nameToSlug("My Workspace") // "my-workspace"
 * nameToSlug("Test 123!") // "test-123"
 */
export function nameToSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
}

/**
 * Generate a unique slug by appending a counter if needed.
 *
 * @example
 * const slug = await generateUniqueSlug({
 *   name: "My Workspace",
 *   checkExists: async (slug) => {
 *     const [existing] = await db.select().from(workspaces).where(eq(workspaces.slug, slug))
 *     return !!existing
 *   }
 * })
 */
export async function generateUniqueSlug(options: GenerateUniqueSlugOptions): Promise<string> {
	const { name, checkExists } = options
	const baseSlug = nameToSlug(name)
	let slug = baseSlug
	let counter = 1

	while (await checkExists(slug)) {
		slug = `${baseSlug}-${counter++}`
	}

	return slug
}
