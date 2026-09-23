import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../lib/firebase';
import { ArchitectProfile, ArchitectureProject } from '../types';
import { NICHES } from '../utils/theme';

export interface PublicPortfolioProject {
  id: string;
  title: string;
  category: string;
  categoryLabel?: string;
  location?: string;
  state?: string;
  coverImage: string;
  images: string[];
  beforeImage?: string;
  afterImage?: string;
  description?: string;
  tags?: string[];
  featured?: boolean;
  areaM2?: number;
  deliveryDate?: string;
  year?: string;
}

export interface PublicPortfolioData {
  userId: string;
  slug: string;
  updatedAt: string;
  officeName: string;
  ownerName?: string;
  title: string;
  photoUrl: string;
  logoUrl?: string;
  location: string;
  specialty: string;
  tagline: string;
  description: string;
  instagramHandle?: string;
  instagramUrl?: string;
  whatsapp?: string;
  email?: string;
  websiteUrl?: string;
  rating: number;
  followersCount?: string;
  niche: string;
  nicheLabel?: string;
  themeColor?: string;
  bgTheme?: string;
  projectsCount: number;
  clientsCount: number;
  totalM2?: number;
  projects: PublicPortfolioProject[];
}

const LOCAL_STORAGE_PORTFOLIO_KEY_PREFIX = 'public_portfolio_data_';

export function buildPublicPortfolioData(
  userId: string,
  profile?: Partial<ArchitectProfile> | null,
  projects?: ArchitectureProject[] | null,
  clientsCount: number = 0
): PublicPortfolioData {
  const safeProfile = profile || {};
  const nicheKey = (safeProfile.niche || 'arquitetura') as string;
  const nicheConfig = NICHES[nicheKey as keyof typeof NICHES] || NICHES.arquitetura;

  // Filter and sanitize projects: ONLY non-sensitive visual and description info
  const publicProjects: PublicPortfolioProject[] = (projects || [])
    .filter((p) => p && !p.deletedAt && (p.coverImage || (p.images && p.images.length > 0) || p.title))
    .map((p) => {
      const catOption = nicheConfig?.categories?.find((c) => (c as any).value === p.category || (c as any).id === p.category);
      let year = '';
      if (p.deliveryDate) {
        year = p.deliveryDate.substring(0, 4);
      } else if (p.createdAt) {
        year = p.createdAt.substring(0, 4);
      }

      return {
        id: p.id || Math.random().toString(),
        title: p.title || 'Projeto',
        category: p.category || 'geral',
        categoryLabel: catOption?.label || p.category || 'Projeto',
        location: p.location || safeProfile.location || '',
        state: p.state || '',
        coverImage: p.coverImage || (p.images && p.images[0]) || '',
        images: Array.isArray(p.images) ? p.images : [],
        beforeImage: p.beforeImage || undefined,
        afterImage: p.afterImage || undefined,
        description: p.description || '',
        tags: Array.isArray(p.tags) ? p.tags : [],
        featured: Boolean(p.featured),
        areaM2: p.areaM2 || undefined,
        deliveryDate: p.deliveryDate || undefined,
        year: year || undefined,
      };
    });

  const totalM2 = publicProjects.reduce((acc, p) => acc + (p.areaM2 || 0), 0);

  const cleanSlug = (safeProfile.name || 'portfolio')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return {
    userId: userId || 'preview',
    slug: cleanSlug || 'studio',
    updatedAt: new Date().toISOString(),
    officeName: safeProfile.name || 'Meu Escritório',
    ownerName: safeProfile.ownerName || '',
    title: safeProfile.title || 'Estúdio Profissional',
    photoUrl: safeProfile.photoUrl || '',
    logoUrl: safeProfile.logoUrl || '',
    location: safeProfile.location || 'Brasil • Atendimento Nacional',
    specialty: safeProfile.specialty || 'Design, Projetos e Criação',
    tagline: safeProfile.tagline || 'Soluções personalizadas e de alto padrão.',
    description: safeProfile.description || 'Atendimento profissional focado em excelência e qualidade.',
    instagramHandle: safeProfile.instagramHandle || '',
    instagramUrl: safeProfile.instagramUrl || '',
    whatsapp: safeProfile.whatsapp || safeProfile.phone || '',
    email: safeProfile.email || '',
    websiteUrl: safeProfile.websiteUrl || '',
    rating: safeProfile.rating || 5.0,
    followersCount: safeProfile.followersCount || '',
    niche: nicheKey,
    nicheLabel: nicheConfig?.label || 'Design & Arquitetura',
    themeColor: safeProfile.themeColor || 'gold',
    bgTheme: safeProfile.bgTheme || 'light_cream',
    projectsCount: publicProjects.length,
    clientsCount: Math.max(clientsCount, publicProjects.length),
    totalM2: totalM2 > 0 ? totalM2 : undefined,
    projects: publicProjects,
  };
}

export function resolveLocalProfileAndProjects(): {
  profile: Partial<ArchitectProfile>;
  projects: ArchitectureProject[];
  clientsCount: number;
} {
  let profile: Partial<ArchitectProfile> = {};
  let projects: ArchitectureProject[] = [];
  let clientsCount = 0;

  const profileKeys = [
    'office_persistent_profile',
    'office_active_profile',
    'office_v2_lfquadrosdecorativos_profile',
    'profile',
    'architectProfile',
  ];

  for (const key of profileKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.name || parsed.title || parsed.specialty || parsed.photoUrl)) {
          profile = { ...profile, ...parsed };
          break;
        }
      }
    } catch {}
  }

  const projectKeys = [
    'office_persistent_architectureProjects',
    'office_v2_lfquadrosdecorativos_architectureProjects',
    'architectureProjects',
  ];

  for (const key of projectKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          projects = parsed;
          break;
        }
      }
    } catch {}
  }

  const clientKeys = [
    'office_persistent_clients',
    'office_v2_lfquadrosdecorativos_clients',
    'clients',
  ];

  for (const key of clientKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          clientsCount = parsed.length;
          break;
        }
      }
    } catch {}
  }

  return { profile, projects, clientsCount };
}

export async function publishPortfolioToFirestore(portfolioData: PublicPortfolioData): Promise<boolean> {
  try {
    if (!portfolioData.userId) return false;

    // 1. Save to LocalStorage for instant resilience
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PORTFOLIO_KEY_PREFIX}${portfolioData.userId}`, JSON.stringify(portfolioData));
      localStorage.setItem('last_published_public_portfolio', JSON.stringify(portfolioData));
    } catch (e) {
      console.warn('LocalStorage save portfolio warning:', e);
    }

    // 2. Save to Firestore
    const sanitized = sanitizeFirestoreData(portfolioData);
    const docRef = doc(db, 'public_portfolios', portfolioData.userId);
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    console.error('Error publishing public portfolio to Firestore:', error);
    return false;
  }
}

export async function fetchPublicPortfolio(userIdOrSlug?: string | null): Promise<PublicPortfolioData | null> {
  try {
    const cleanId = (userIdOrSlug || '').trim();

    // 1. Try local cache by specific ID
    if (cleanId) {
      try {
        const cached = localStorage.getItem(`${LOCAL_STORAGE_PORTFOLIO_KEY_PREFIX}${cleanId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {}

      // 2. Try Firestore by Doc ID (User ID)
      try {
        const docRef = doc(db, 'public_portfolios', cleanId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as PublicPortfolioData;
          try {
            localStorage.setItem(`${LOCAL_STORAGE_PORTFOLIO_KEY_PREFIX}${cleanId}`, JSON.stringify(data));
          } catch {}
          return data;
        }
      } catch (err) {
        console.warn('Firestore fetch portfolio warning:', err);
      }
    }

    // 3. Fallback: check general last published portfolio in localStorage
    try {
      const last = localStorage.getItem('last_published_public_portfolio');
      if (last) {
        const parsed = JSON.parse(last);
        if (parsed && (parsed.officeName || (parsed.projects && parsed.projects.length > 0))) {
          return parsed;
        }
      }
    } catch {}

    // 4. Fallback: construct from local storage persistence keys
    const local = resolveLocalProfileAndProjects();
    if (local.profile && (local.profile.name || local.profile.photoUrl || local.projects.length > 0)) {
      const generated = buildPublicPortfolioData(
        cleanId || 'preview',
        local.profile,
        local.projects,
        local.clientsCount
      );
      return generated;
    }

    return null;
  } catch (error) {
    console.error('Error fetching public portfolio:', error);
    const local = resolveLocalProfileAndProjects();
    return buildPublicPortfolioData('preview', local.profile, local.projects, local.clientsCount);
  }
}
