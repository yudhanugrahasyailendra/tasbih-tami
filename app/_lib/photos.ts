/** "pos" mengatur bagian foto yang dipertahankan saat dipotong (object-position). */
export type Photo = { src: string; alt: string; pos: string; w: number; h: number };

const p = (key: string, alt: string, pos: string, w = 959, h = 1440): Photo => ({ src: `/img/${key}.webp`, alt, pos, w, h });

export const PHOTOS = {
  sofa: p("sofa", "Kedua mempelai duduk di sofa beludru merah di depan tirai emas", "50% 78%"),
  profil: p("profil", "Kedua mempelai berdiri berhadapan di depan tirai putih yang tertembus cahaya", "50% 78%"),
  profilbw: p("profilbw", "Foto hitam putih kedua mempelai berhadapan di depan tirai", "50% 78%"),
  celah: p("celah", "Kedua mempelai berdiri di celah tirai emas", "50% 70%"),
  celahbw: p("celahbw", "Foto hitam putih kedua mempelai di celah tirai", "50% 70%"),
  lorong: p("lorong", "Kedua mempelai berjalan di antara dua barisan kursi merah", "50% 55%", 1440, 959),
  tangga1: p("tangga1", "Kedua mempelai menuruni tangga berpagar hitam", "34% 60%"),
  pagar: p("pagar", "Mempelai wanita bersandar di pagar tangga membawa buket, mempelai pria berdiri di belakangnya", "50% 62%"),
  tangga2: p("tangga2", "Mempelai wanita tersenyum menoleh ke mempelai pria di tangga", "50% 60%"),
  rak: p("rak", "Kedua mempelai berdiri bersandar di depan rak hitam pada dinding krem", "50% 62%"),
  sofa2: p("sofa2", "Kedua mempelai duduk di sofa merah, difoto lebih dekat", "50% 62%"),
  bingkai: p("bingkai", "Kedua mempelai di tangga, dibingkai dinding bermotif gelap", "50% 62%"),
  intip: p("intip", "Kedua mempelai mengintip dari balik tirai sambil tersenyum", "40% 55%"),
};

export type PhotoKey = keyof typeof PHOTOS;

/** Urutan foto di galeri */
export const GALLERY: PhotoKey[] = ["sofa", "profil", "celah", "lorong", "tangga2", "rak", "profilbw", "pagar", "sofa2", "celahbw", "tangga1", "bingkai", "intip"];
