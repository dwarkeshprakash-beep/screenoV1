const fs = require('fs');
const path = require('path');

const colors = {
  '#EFEDFD': 'var(--brand-50)',
  '#DEDAFB': 'var(--brand-100)',
  '#BDB4F6': 'var(--brand-200)',
  '#9C8FF2': 'var(--brand-300)',
  '#7B69ED': 'var(--brand-400)',
  '#5B4FE9': 'var(--brand-500)',
  '#4A3FCE': 'var(--brand-600)',
  '#3A31A3': 'var(--brand-700)',
  '#2A2378': 'var(--brand-800)',
  '#1A164D': 'var(--brand-900)',
  '#FFEDE6': 'var(--danger-50)',
  '#FFD4C2': 'var(--danger-100)',
  '#FF5C35': 'var(--danger-500)',
  '#E0451F': 'var(--danger-600)',
  '#B53618': 'var(--danger-700)',
  '#ECFDF5': 'var(--success-50)',
  '#D1FAE5': 'var(--success-100)',
  '#059669': 'var(--success-500)',
  '#047857': 'var(--success-600)',
  '#065F46': 'var(--success-700)',
  '#FFFBEB': 'var(--warning-50)',
  '#FEF3C7': 'var(--warning-100)',
  '#D97706': 'var(--warning-500)',
  '#B45309': 'var(--warning-600)',
  '#92400E': 'var(--warning-700)',
  '#EFF6FF': 'var(--info-50)',
  '#2563EB': 'var(--info-500)',
  '#1D4ED8': 'var(--info-600)',
  '#F8FAFC': 'var(--slate-50)',
  '#F1F5F9': 'var(--slate-100)',
  '#E2E8F0': 'var(--slate-200)',
  '#CBD5E1': 'var(--slate-300)',
  '#94A3B8': 'var(--slate-400)',
  '#6B7280': 'var(--slate-500)',
  '#4B5563': 'var(--slate-600)',
  '#374151': 'var(--slate-700)',
  '#1F2937': 'var(--slate-800)',
  '#0F172A': 'var(--slate-900)',
  '#FFF': 'var(--bg-surface)',
  '#FFFFFF': 'var(--bg-surface)'
};

const escapeRegExp = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('F:\\screeno v1\\frontend\\src', function(filePath) {
  if (filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (let hex in colors) {
      let reg = new RegExp(escapeRegExp(hex) + '(?![a-zA-Z0-9])', 'gi');
      content = content.replace(reg, colors[hex]);
    }
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
