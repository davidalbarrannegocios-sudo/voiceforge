import { groq } from 'next-sanity'

export const postsQuery = groq`*[_type == "post"] | order(publishedAt desc) {
  _id, title, slug, excerpt, mainImage, publishedAt,
  "categories": categories[]->title,
  "author": author->name
}`

export const postQuery = groq`*[_type == "post" && slug.current == $slug][0] {
  _id, title, slug, excerpt, mainImage, publishedAt, body,
  seoTitle, seoDescription,
  "categories": categories[]->title,
  "author": author->{name, image, bio}
}`

export const featuredPostsQuery = groq`*[_type == "post"] | order(publishedAt desc)[0...3] {
  _id, title, slug, excerpt, mainImage, publishedAt,
  "categories": categories[]->title
}`
