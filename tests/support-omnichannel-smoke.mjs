import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const migration=read('db/migrations/0024_support_omnichannel.sql');
const ingest=read('functions/api/support/ingest.js');
const admin=read('functions/api/admin/support-tickets.js');
const guard=read('.github/workflows/d1-production-migration.yml');
const roadmap=read('docs/CONTINUOUS_DEVELOPMENT_ROADMAP.md');

for(const token of ['support_channel_contacts','support_external_events','support_outbox','idx_support_outbox_delivery'])if(!migration.includes(token))throw new Error(`missing omnichannel schema token ${token}`);
for(const token of ['UNIQUE(channel,external_event_id)','UNIQUE(message_id,channel)'])if(!migration.includes(token))throw new Error(`missing idempotency guard ${token}`);
for(const token of ['SUPPORT_INGEST_SECRET','support_ingest_disabled','support_omnichannel_not_ready','duplicate:true','external_message_received'])if(!ingest.includes(token))throw new Error(`missing ingest safety/capability ${token}`);
for(const token of ['DELIVERABLE_CHANNELS','queueExternalReply','channel_destination_missing','delivery:\'queued\'','support_outbox'])if(!admin.includes(token))throw new Error(`missing outbound queue capability ${token}`);
if(!guard.includes('0024_support_omnichannel.sql'))throw new Error('production migration guard does not know migration 0024');
for(const token of ['Support Omnichannel Foundation','production/security/data-integrity blocker','Revenue','Storefront & Conversion'])if(!roadmap.includes(token))throw new Error(`continuous roadmap missing ${token}`);
console.log('support omnichannel smoke: ok');
