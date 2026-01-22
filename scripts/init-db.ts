#!/usr/bin/env node

import { initDatabase } from '../lib/db';
import { initDefaultTemplates } from './init-templates';
import { initWritingPhrases } from './init-phrases';

console.log('Initializing database...');
initDatabase();
console.log('Database initialization complete!');

console.log('Initializing default templates...');
initDefaultTemplates();
console.log('Template initialization complete!');

console.log('Initializing writing phrases...');
initWritingPhrases();
console.log('Writing phrases initialization complete!');
