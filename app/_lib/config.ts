export type Person = {
  name: string;
  full: string;
  parents: string;
};

export type InviteEvent = {
  name: string;
  start: string;
  end?: string;
  what: string;
  venue: string;
  address: string;
};

export const CONFIG = {
  groom: {
    name: "Tasbih",
    full: "Muh. Tasbih,S.H.",
    parents: "Tunggal dari Bapak Muh.Lukman & Hj.Indo Intang,S.Kep.,Ns",
  } satisfies Person,
  bride: {
    name: "Tami",
    full: "ST. Nurul utami S, S.H.",
    parents: "ketiga dari bapak syaripuddin T, S.H. Dan Ibu Fitriah",
  } satisfies Person,
  countdown: { to: "2026-12-05T09:00:00+08:00", label: "akad nikah" },
  // Tambah acara lain (mis. Mappacci) dengan menyalin satu objek di bawah.
  events: [
    {
      name: "Akad nikah",
      start: "2026-12-05T10:00:00+08:00",
      what: "Ijab kabul yang disaksikan keluarga dan kerabat dekat.",
      venue: "GEDUNG ISLAMIC CENTRE IMMIM 1",
      address:
        "Jl. Jend. Sudirman No. 33 Sawerigading Kec. Ujung Pandang Makassar",
    },
    {
      name: "Resepsi",
      start: "2026-12-05T11:00:00+08:00",
      what: "Jamuan bersama keluarga dan sahabat. Anda dipersilakan memberi doa langsung kepada kedua mempelai.",
      venue: "GEDUNG ISLAMIC CENTRE IMMIM 1",
      address:
        "Jl. Jend. Sudirman No. 33 Sawerigading Kec. Ujung Pandang Makassar",
    },
    {
      name: "Resepsi",
      start: "2026-12-06T10:00:00+08:00",
      what: "Jamuan bersama keluarga dan sahabat. Anda dipersilakan memberi doa langsung kepada kedua mempelai.",
      venue: "GEDUNG ISLAMIC CENTRE IMMIM 1",
      address:
        "Jl. Poros Pakkasalo, Salo belawa Dekat jembatan tiga",
    },
  ] as InviteEvent[],
  // dresscode: "krem, peach, atau merah marun", // kosongkan untuk menyembunyikan
  map: {
    venue: "GEDUNG ISLAMIC CENTRE IMMIM 1",
    address: "Jl. Jend. Sudirman No. 33 Sawerigading Kec. Ujung Pandang Makassar",
    query: "Gedung Islamic Centre IMMIM, Makassar", // alamat, nama tempat, atau "lat,lng"
  },
  gifts: [
    {
      bank: "Bank BCA",
      number: "7891407118",
      holder: "Muh.Tasbih",
    },
  ],
  // giftAddress: {
  //   to: "Andi Nurhaliza Putri",
  //   address: "Jl. Contoh No. 12, Watampone, Kab. Bone 92711",
  // },
  music:
    "/sounds/Richard Marx - Right Here Waiting (Piano Cover by Riyandi Kusuma).mp3", // kosongkan ("") untuk menghilangkan musik dan tombolnya
  photoCredit: "", // contoh: 'Foto oleh Studio Contoh'; kosong = disembunyikan
  storageKey: "undangan-prewedding-ucapan",
  apiUrl: "", // opsional: GET mengembalikan array, POST menerima satu ucapan (JSON)
};
