/**
 * Utilities for formatting and building Instagram handles, URLs and follower counts.
 */

export const cleanInstagramHandle = (input?: string): string => {
  if (!input || !input.trim()) return '';
  let raw = input.trim();
  
  if (raw.includes('instagram.com/')) {
    const parts = raw.split('instagram.com/');
    const userPart = (parts[1] || '').split('/')[0]?.split('?')[0]?.trim();
    if (userPart) {
      return `@${userPart.replace(/^@/, '')}`;
    }
  }

  const username = raw.replace(/^@/, '').trim();
  return username ? `@${username}` : raw;
};

export const buildInstagramUrl = (handle?: string, url?: string): string => {
  // If a valid custom URL was supplied (and it's not the default root instagram.com)
  if (url && url.trim() && url.trim() !== 'https://instagram.com' && url.trim() !== 'https://instagram.com/') {
    const trimmed = url.trim();
    if (trimmed.includes('instagram.com/')) {
      return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    }
  }

  // Build directly from handle or input text
  const source = handle || url || '';
  if (!source || !source.trim()) {
    return 'https://instagram.com';
  }

  let clean = source.trim();
  if (clean.includes('instagram.com/')) {
    const parts = clean.split('instagram.com/');
    const userPart = (parts[1] || '').split('/')[0]?.split('?')[0]?.trim();
    if (userPart) {
      return `https://instagram.com/${userPart.replace(/^@/, '')}`;
    }
  }

  const username = clean.replace(/^@/, '').trim();
  if (username) {
    return `https://instagram.com/${username}`;
  }

  return 'https://instagram.com';
};

export const formatFollowersCount = (input?: string): string => {
  if (!input || !input.trim()) return '';
  const raw = input.trim();

  // If already contains "seguidor" or "seguidores", keep it clean
  if (/seguidor/i.test(raw)) {
    return raw;
  }

  const cleanNum = raw.toLowerCase().replace(/\s+/g, '');

  if (/^\d+k$/.test(cleanNum)) {
    const num = cleanNum.replace('k', '');
    return `${num} mil seguidores`;
  }

  if (/^\d+(\.\d+)?m$/.test(cleanNum)) {
    const num = cleanNum.replace('m', '');
    return `${num} mi seguidores`;
  }

  const numVal = parseFloat(cleanNum.replace(',', '.'));
  if (!isNaN(numVal)) {
    if (numVal >= 1000000) {
      const millions = (numVal / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      return `${millions} mi seguidores`;
    }
    if (numVal >= 1000) {
      const thousands = (numVal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      return `${thousands} mil seguidores`;
    }
    if (numVal > 0 && numVal <= 999) {
      // e.g. "63" typed in social context
      return `${numVal} mil seguidores`;
    }
  }

  return `${raw} seguidores`;
};
