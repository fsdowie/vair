// Shared design tokens — mirrors the color palette used by the web app
// (src/RefereeLLM.jsx, src/Admin.jsx) so the mobile app looks like the same
// product, not a reskin.
export const colors = {
  bgTop: '#0a1628',
  bgBottom: '#0d2137',
  card: 'rgba(13, 33, 55, 0.9)',
  cardSolid: '#0d2137',
  border: 'rgba(29,158,117,0.3)',
  borderSoft: 'rgba(29,158,117,0.2)',
  text: '#e8f5e9',
  textDim: 'rgba(232,245,233,0.6)',
  textFaint: 'rgba(232,245,233,0.4)',
  green: '#1d9e75',
  greenBright: '#5ecda4',
  greenDeep: '#0e7a58',
  greenDeepest: '#0a5c43',
  red: '#ef9a9a',
  redBright: '#e53935',
  redDeep: '#b71c1c',
  amber: '#ffb74d',
  inputBg: 'rgba(10,30,15,0.5)',
};

export const gradients = {
  // react-native has no CSS gradients without an extra native module, so
  // screens use a solid bgBottom background; this constant documents the
  // web equivalent for anyone porting more screens later.
  webBackground: 'linear-gradient(135deg, #0a1628, #0d2137)',
};
