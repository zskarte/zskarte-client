import { Viewport } from './viewport';

export interface ZSO {
  id: string;
  name: string;
  auth: string;
  url: string;
  initialViewPort: Viewport;
  defaultLocale: string;
}

export function getZSOById(zsoId: string): ZSO | null {
  for (const z of LIST_OF_ZSO) {
    if (zsoId === z.id) {
      return z;
    }
  }
  return null;
}

export const ZSO_GUEST: ZSO = {
  id: 'zso_guest',
  name: 'ZSO Gast (1h)',
  auth: '',
  initialViewPort: {
    coordinates: [828547.63, 5933321.42],
    zoomLevel: 16,
  },
  url: 'https://zskarte.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_BS: ZSO = {
  id: 'zso_be_bs',
  name: 'Amt für Bevölkerungsschutz, Sport und Militär des Kantons Bern',
  auth: 'c177b2827e860f2b55500964ab9dc090',
  initialViewPort: {
    coordinates: [830544.7, 5935141.38],
    zoomLevel: 16,
  },
  url: 'https://www.bsm.sid.be.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_CR: ZSO = {
  id: 'zso_be_cr',
  name: 'CRC Jura bernois – Formation',
  auth: 'be67155b22de9239046294369f22efd0',
  initialViewPort: {
    coordinates: [791469.33, 5978528.31],
    zoomLevel: 16,
  },
  url: 'https://www.opcjb.ch/organisation/crc',
  defaultLocale: 'fr',
};

export const ZSO_BE_GF: ZSO = {
  id: 'zso_be_gf',
  name: 'GFO Köniz',
  auth: '9ffc6e9fbc80221f5e025d18375fdeab',
  initialViewPort: {
    coordinates: [825240.33, 5926977.36],
    zoomLevel: 16,
  },
  url: 'https://www.koeniz.ch/verwaltung/praesidiales-und-finanzen/gemeindefuehrungsorgan.page/802',
  defaultLocale: 'de',
};

export const ZSO_BE_KK: ZSO = {
  id: 'zso_be_kk',
  name: 'Kantonales Katastrophen Einsatzelement (KKE) des Kantons Bern',
  auth: 'bc5d35ec79050596d21920e6c3935db7',
  initialViewPort: {
    coordinates: [830544.7, 5935141.38],
    zoomLevel: 16,
  },
  url: 'https://www.bsm.sid.be.ch/de/start/themen/bevoelkerungsschutz-zivilschutz/zivilschutz/zso-kanton-bern.html',
  defaultLocale: 'de',
};

export const ZSO_BE_OC: ZSO = {
  id: 'zso_be_oc',
  name: 'OCRég Jura bernois',
  auth: '15871f19c3270f616b2402745f6f9cef',
  initialViewPort: {
    coordinates: [791469.33, 5978528.31],
    zoomLevel: 16,
  },
  url: 'https://www.jb-b.ch/1074-organe-de-conduite-regional-(ocreg)',
  defaultLocale: 'fr',
};

export const ZSO_FR_FR: ZSO = {
  id: 'zso_fr_fr',
  name: 'PCi Fribourgeoise',
  auth: 'f567e31a75e3e413e018e96b6ea80ac8',
  initialViewPort: {
    coordinates: [784702.5323756159, 5912939.19705637],
    zoomLevel: 10,
  },
  url: 'https://www.fr.ch/dsj/sppam/sommaire/protection-civile',
  defaultLocale: 'fr',
};

export const ZSO_BE_JB: ZSO = {
  id: 'zso_be_jb',
  name: 'PCi Jura bernois',
  auth: '954e61c327499c1face095a3ee3182f2',
  initialViewPort: {
    coordinates: [791469.33, 5978528.31],
    zoomLevel: 16,
  },
  url: 'https://www.opcjb.ch/organisation/opcjb',
  defaultLocale: 'fr',
};

export const ZSO_BE_AB: ZSO = {
  id: 'zso_be_ab',
  name: 'RFO Aarberg',
  auth: '445a1b02ed1a32d96fd4b014675adb63',
  initialViewPort: {
    coordinates: [813417.09, 5955323.35],
    zoomLevel: 16,
  },
  url: 'https://www.rfoaarberg.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_BB: ZSO = {
  id: 'zso_be_bb',
  name: 'RFO Biel/Bienne Regio',
  auth: 'a680215d2db37d55ba0fdbe182e4e8b8',
  initialViewPort: {
    coordinates: [807258.89, 5964284.69],
    zoomLevel: 16,
  },
  url: 'https://www.biel-bienne.ch/de/rfo-bielbienne-regio.html/494',
  defaultLocale: 'de',
};

export const ZSO_BE_RF: ZSO = {
  id: 'zso_be_rf',
  name: 'RFO Region Laupen',
  auth: '22e0af391ec87bdd882b73d8b8dfde17',
  initialViewPort: {
    coordinates: [814637.15, 5924874.01],
    zoomLevel: 16,
  },
  url: 'https://www.rfo-regionlaupen.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_RK: ZSO = {
  id: 'zso_be_rk',
  name: 'RKZ BBM',
  auth: '49878b948f181ca1b0b2868fa5953b66',
  initialViewPort: {
    coordinates: [826307.88, 5926387.53],
    zoomLevel: 16,
  },
  url: 'https://www.rkzbbm.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_RS: ZSO = {
  id: 'zso_be_rs',
  name: 'RKZ Spiez',
  auth: 'e9cb5accafe22422f9d0ea2dcedd218b',
  initialViewPort: {
    coordinates: [850323.95, 5893773.97],
    zoomLevel: 16,
  },
  url: 'https://www.rkz-spiez.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_SE: ZSO = {
  id: 'zso_be_se',
  name: 'VKFO Seeland',
  auth: '81cd74f7dcd3db8df43c9c096e3b3afe',
  initialViewPort: {
    coordinates: [809928.33, 5949227.91],
    zoomLevel: 13,
  },
  url: 'https://www.j3l.ch/de/Z10487/biel-bienne-seeland-tourismus',
  defaultLocale: 'de',
};

export const ZSO_BE_ZA: ZSO = {
  id: 'zso_be_za',
  name: 'ZAR Ausbildungszentrum',
  auth: '7a538ad8cfb29a07a9532d4559ade398',
  initialViewPort: {
    coordinates: [866188.09, 5982338.42],
    zoomLevel: 16,
  },
  url: 'https://www.zar-ag.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_AT: ZSO = {
  id: 'zso_be_at',
  name: 'ZSO Aaretal',
  auth: 'a885da7695a8c0a2704c95dc5fe8ec83',
  initialViewPort: {
    coordinates: [842606.17, 5922886.81],
    zoomLevel: 16,
  },
  url: 'https://www.zso-muensingen.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_AR: ZSO = {
  id: 'zso_be_ar',
  name: 'ZSO Alpenregion',
  auth: '0243ca694b8e931afcb77088a391be57',
  initialViewPort: {
    coordinates: [911613.12, 5897859.04],
    zoomLevel: 16,
  },
  url: 'https://www.meiringen.ch/aemter/8829',
  defaultLocale: 'de',
};

export const ZSO_BE_BA: ZSO = {
  id: 'zso_be_ba',
  name: 'ZSO Bantiger',
  auth: 'fbaae0e6ab16e582b38a7fe0119f9ee2',
  initialViewPort: {
    coordinates: [834201.55, 5934229.72],
    zoomLevel: 16,
  },
  url: 'https://www.ostermundigen.ch/zivilschutz',
  defaultLocale: 'de',
};

export const ZSO_BE_BP: ZSO = {
  id: 'zso_be_bp',
  name: 'ZSO Bern plus',
  auth: '48c8a0ae3e192e2eec155e0c2bc02f02',
  initialViewPort: {
    coordinates: [829038.2228723184, 5933590.521128002],
    zoomLevel: 16,
  },
  url: 'https://www.bern.ch/politik-und-verwaltung/stadtverwaltung/sue/schutz-und-rettung-bern/zivilschutz/',
  defaultLocale: 'de',
};

export const ZSO_BE_GA: ZSO = {
  id: 'zso_be_ga',
  name: 'ZSO Gantrisch',
  auth: '38b6b6405d4870c76db1276a08c379c9',
  initialViewPort: {
    coordinates: [832764.41, 5910894.99],
    zoomLevel: 16,
  },
  url: 'https://www.schwarzenburg.ch/ueber-uns/verwaltung/praesidiales/',
  defaultLocale: 'de',
};

export const ZSO_BE_GN: ZSO = {
  id: 'zso_be_gn',
  name: 'ZSO Grauholz Nord',
  auth: '5bbbd390896fbea482d187770a3bd46a',
  initialViewPort: {
    coordinates: [836354.47, 5950399.28],
    zoomLevel: 16,
  },
  url: 'https://www.bevs-grauholz.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_GT: ZSO = {
  id: 'zso_be_gt',
  name: 'ZSO Gürbetal',
  auth: '1a45e7ae7006bb586002b555d9838ae1',
  initialViewPort: {
    coordinates: [834770.39, 5925649.47],
    zoomLevel: 16,
  },
  url: 'http://www.zso-guerbetal.ch/de/index.html',
  defaultLocale: 'de',
};

export const ZSO_BE_JF: ZSO = {
  id: 'zso_be_jf',
  name: 'ZSO Jungfrau',
  auth: '359d2583dd0f578eb1798e7c13090369',
  initialViewPort: {
    coordinates: [875358.59, 5890956.44],
    zoomLevel: 16,
  },
  url: 'https://www.zso-jungfrau.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_OA: ZSO = {
  id: 'zso_be_oa',
  name: 'ZSO Oberaargau-West',
  auth: '755f238b5185d267a136f543f6a7062b',
  initialViewPort: {
    coordinates: [856181.58, 5986315.9],
    zoomLevel: 16,
  },
  url: 'https://www.zso-oaw.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_RA: ZSO = {
  id: 'zso_be_ra',
  name: 'ZSO Region Aarberg',
  auth: '28694ea6267e914855e3488d0b4e6827',
  initialViewPort: {
    coordinates: [813362.88, 5954168.67],
    zoomLevel: 16,
  },
  url: 'https://www.zsra.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_RB: ZSO = {
  id: 'zso_be_rb',
  name: 'ZSO Region Burgdorf',
  auth: '347d73226c1727a7c328e8238ef5bf80',
  initialViewPort: {
    coordinates: [849267.53, 5950757.09],
    zoomLevel: 16,
  },
  url: 'http://www.zivilschutzregion-burgdorf.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_RP: ZSO = {
  id: 'zso_be_rp',
  name: 'ZSO Region Kirchbergplus',
  auth: '1a29a9793323a33b18dbdabf58732550',
  initialViewPort: {
    coordinates: [844343.87, 5956039.4],
    zoomLevel: 16,
  },
  url: 'https://www.zsorkplus.ch/de/',
  defaultLocale: 'de',
};

export const ZSO_BE_KO: ZSO = {
  id: 'zso_be_ko',
  name: 'ZSO Region Köniz',
  auth: 'be6f24499a13902144bc9416cb99116b',
  initialViewPort: {
    coordinates: [825240.33, 5926977.36],
    zoomLevel: 16,
  },
  url: 'https://www.zsoregionkoeniz.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_RL: ZSO = {
  id: 'zso_be_rl',
  name: 'ZSO Region Langenthal',
  auth: '8865f7a13bbaacf4720b493bbdc24437',
  initialViewPort: {
    coordinates: [865484.55, 5977956.28],
    zoomLevel: 16,
  },
  url: 'https://zr-langenthal.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_RE: ZSO = {
  id: 'zso_be_re',
  name: 'ZSO Region Langnau i.E.',
  auth: '4fc3b95ff7b90e8d529a002518f96af9',
  initialViewPort: {
    coordinates: [866758.05, 5932662.67],
    zoomLevel: 16,
  },
  url: 'https://langnau-ie.ch/politik-verwaltung/verwaltung/oeffentliche-sicherheit',
  defaultLocale: 'de',
};

export const ZSO_BE_SA: ZSO = {
  id: 'zso_be_sa',
  name: 'ZSO Saanen plus',
  auth: '6a28e717f4936517a96e36956983935a',
  initialViewPort: {
    coordinates: [808448.9, 5859305.26],
    zoomLevel: 16,
  },
  url: 'https://www.zsosaanenplus.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_SP: ZSO = {
  id: 'zso_be_sp',
  name: 'ZSO Spiez',
  auth: '82be7ff7634714d572ca955f7021f6c4',
  initialViewPort: {
    coordinates: [854633.13, 5891978.82],
    zoomLevel: 16,
  },
  url: 'https://www.spiez.ch/de/verwaltung/abteilungen/detail.php?i=29',
  defaultLocale: 'de',
};

export const ZSO_BE_SZ: ZSO = {
  id: 'zso_be_sz',
  name: 'ZSO Steffisburg-Zulg',
  auth: '5e209578d1d35e83ef2a9689fffd798b',
  initialViewPort: {
    coordinates: [850059.01, 5905922.76],
    zoomLevel: 16,
  },
  url: 'https://www.steffisburg.ch/de/verwaltung/abteilungen/62_zivilschutz-steffisburg-zulg',
  defaultLocale: 'de',
};

export const ZSO_BE_TP: ZSO = {
  id: 'zso_be_tp',
  name: 'ZSO Thun plus',
  auth: 'd8becf30d11b55b35068f7119bbe6ef0',
  initialViewPort: {
    coordinates: [849143.74, 5902660.63],
    zoomLevel: 16,
  },
  url: 'https://www.zsothunplus.ch/zso',
  defaultLocale: 'de',
};

export const ZSO_BE_TW: ZSO = {
  id: 'zso_be_tw',
  name: 'ZSO Thun-Westamt',
  auth: '9ad9136edfd1cbf07988b9f3d93d87a5',
  initialViewPort: {
    coordinates: [843169.45, 5905178.3],
    zoomLevel: 16,
  },
  url: 'https://www.uetendorf.ch/verwaltung/abteilungen/praesidialabteilung/sicherheit/zivilschutz.html/31',
  defaultLocale: 'de',
};

export const ZSO_BE_TR: ZSO = {
  id: 'zso_be_tr',
  name: 'ZSO Trachselwald PLUS',
  auth: 'ad894c8539818ca7244e8a82d9eee664',
  initialViewPort: {
    coordinates: [855989.0, 5942934.31],
    zoomLevel: 16,
  },
  url: 'https://www.zso-trawplus.ch/',
  defaultLocale: 'de',
};

export const ZSO_BE_WB: ZSO = {
  id: 'zso_be_wb',
  name: 'ZSO Worb-Bigenthal',
  auth: '24d5e56c149671c9a32e8c474222d366',
  initialViewPort: {
    coordinates: [841872.57, 5929964.62],
    zoomLevel: 16,
  },
  url: 'https://www.worb.ch/unterinstanzen/9703',
  defaultLocale: 'de',
};

export const LIST_OF_ZSO: ZSO[] = [
  ZSO_GUEST,
  ZSO_BE_BS,
  ZSO_BE_CR,
  ZSO_BE_GF,
  ZSO_BE_KK,
  ZSO_BE_OC,
  ZSO_BE_JB,
  ZSO_BE_AB,
  ZSO_BE_BB,
  ZSO_BE_RF,
  ZSO_BE_RK,
  ZSO_BE_RS,
  ZSO_BE_SE,
  ZSO_BE_ZA,
  ZSO_BE_AT,
  ZSO_BE_AR,
  ZSO_BE_BA,
  ZSO_BE_BP,
  ZSO_BE_GA,
  ZSO_BE_GN,
  ZSO_BE_GT,
  ZSO_BE_JF,
  ZSO_BE_OA,
  ZSO_BE_RA,
  ZSO_BE_RB,
  ZSO_BE_RP,
  ZSO_BE_KO,
  ZSO_BE_RL,
  ZSO_BE_RE,
  ZSO_BE_SA,
  ZSO_BE_SP,
  ZSO_BE_SZ,
  ZSO_BE_TP,
  ZSO_BE_TW,
  ZSO_BE_TR,
  ZSO_BE_WB,
];
