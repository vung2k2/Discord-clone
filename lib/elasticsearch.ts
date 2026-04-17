import { Client } from '@elastic/elasticsearch';

const node = process.env.ELASTICSEARCH_NODE;

const createClient = () => {
  if (!node) {
    return null;
  }

  return new Client({ node });
};

declare global {
  var elasticsearchClient: Client | null | undefined;
}

export const elasticsearch = global.elasticsearchClient ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  global.elasticsearchClient = elasticsearch;
}

export const isElasticsearchConfigured = Boolean(node);
