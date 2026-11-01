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
    full: "Muh. Tasbih, S.H.",
    parents: "Tunggal dari Bapak Muh.Lukman & Hj. Indo Intang, S.Kep.,Ns",
  } satisfies Person,
  bride: {
    name: "Tami",
    full: "ST. Nurul Utami S, S.H.",
    parents: "Ketiga dari Bapak Syaripuddin T, S.H. & Ibu Fitriah",
  } satisfies Person,
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
    // {
    //   name: "Resepsi",
    //   start: "2026-12-05T11:00:00+08:00",
    //   what: "Jamuan bersama keluarga dan sahabat. Anda dipersilakan memberi doa langsung kepada kedua mempelai.",
    //   venue: "GEDUNG ISLAMIC CENTRE IMMIM 1",
    //   address:
    //     "Jl. Jend. Sudirman No. 33 Sawerigading Kec. Ujung Pandang Makassar",
    // },
    {
      name: "Resepsi",
      start: "2026-12-06T10:00:00+08:00",
      what: "Syukuran bersama keluarga besar, kerabat, dan sahabat di kediaman mempelai pria. Kami menantikan kehadiran dan doa restu Anda untuk kedua mempelai.",
      venue: "RUMAH KEDIAMAN MEMPELAI LAKI-LAKI (MUH.TASBIH)",
      address:
        "Jl. Poros Pakkasalo, Salo Belawa Dekat Jembatan Tiga",
    },
  ] as InviteEvent[],
  // dresscode: "krem, peach, atau merah marun", // kosongkan untuk menyembunyikan
  map: {
    venue: "RUMAH KEDIAMAN MEMPELAI LAKI-LAKI (MUH.TASBIH)",
    address: "Jl. Poros Pakkasalo, Salo Belawa Dekat Jembatan Tiga",
    query: "3274+CXQ Kalosi Alau, Sidenreng Rappang Regency, South Sulawesi", // alamat, nama tempat, atau "lat,lng"
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
    "/sounds/Beautiful In White - Saxserenade (Westlife - Saxophone Cover).mp3", // kosongkan ("") untuk menghilangkan musik dan tombolnya
  developer: {
    name: "Amanah Advertising",
    logo: "/Amanah_Adv-removebg-preview.png",
    contactName: "Amanah Advertising",
    whatsapp: "6282187711537", // format internasional tanpa + (082187711537 -> 6282187711537)
    whatsappLabel: "0821-8771-1537",
  },
  photoCredit: "", // contoh: 'Foto oleh Studio Contoh'; kosong = disembunyikan
};
