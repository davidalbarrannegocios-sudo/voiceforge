import { createClient } from 'next-sanity'

export const client = createClient({
  projectId: 'zrb45klt',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})
