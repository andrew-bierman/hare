/**
 * Slug Generation Utility
 *
 * Provides URL-safe slug generation from names/titles.
 */

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
 * @param name - The original name to convert
 * @param checkExists - Async function to check if a slug already exists
 * @param excludeId - Optional ID to exclude from existence check (for updates)
 *
 * @example
 * const slug = await generateUniqueSlug("My Workspace", async (slug) => {
 *   const [existing] = await db.select().from(workspaces).where(eq(workspaces.slug, slug))
 *   return !!existing
 * })
 */
export async function generateUniqueSlug(
	name: string,
	checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
	const baseSlug = nameToSlug(name)
	let slug = baseSlug
	let counter = 1

	while (await checkExists(slug)) {
		slug = `${baseSlug}-${counter++}`
	}

	return slug
}
