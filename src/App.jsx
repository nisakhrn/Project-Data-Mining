import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './App.css';
import ProyeksiInteraktif from './components/ProyeksiInteraktif';

const pilihKunci = (kolom, kandidat, fallback = '') => {
  const ditemukan = kandidat.find((item) => kolom.includes(item));
  return ditemukan ?? fallback;
};

const ambilTahunProyeksi = (namaKolom) => {
  const cocok = /^Proyeksi_(\d{4})$/i.exec(namaKolom);
  return cocok ? Number(cocok[1]) : null;
};

// Peta Satuan untuk Tampilan Regresi di App.jsx
const METADATA_INDIKATOR_APP = {
  "Jumlah Murid SD": { satuan: "murid", tipe: "jumlah" },
  "Jumlah Murid SMP": { satuan: "murid", tipe: "jumlah" },
  "Jumlah Murid SMA": { satuan: "murid", tipe: "jumlah" },
  "Jumlah Murid SMK": { satuan: "murid", tipe: "jumlah" },
  "Rata-rata Lama Sekolah": { satuan: "tahun", tipe: "desimal" },
  "Harapan Lama Sekolah": { satuan: "tahun", tipe: "desimal" },
  "Angka Melek Huruf": { satuan: "%", tipe: "desimal" }
};

const formatAngkaRapi = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return value;
  }

  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1');
};

const formatCluster = (cluster) => `Cluster ${cluster}`;

export default function App() {
  const [kategoriUtama, setKategoriUtama] = useState('sekolah');
  const [sedangRingkasanUtama, setSedangRingkasanUtama] = useState(false);
  const [ringkasanGabungan, setRingkasanGabungan] = useState({
    klasifikasi: null,
    clustering: null,
    regresi: null
  });
  const [halamanAktif, setHalamanAktif] = useState('evaluasi');
  const [tampilanRegresi, setTampilanRegresi] = useState('grafik'); // 'grafik' | 'interaktif'
  const [dataGrafik, setDataGrafik] = useState([]);
  const [csvAktif, setCsvAktif] = useState('/data/klasifikasi/hasil_klasifikasi.csv');
  const [kataKunci, setKataKunci] = useState('');
  const [modeUrut, setModeUrut] = useState('prioritas');
  const [bidangAktif, setBidangAktif] = useState('Pendidikan');
  const [kunciLabel, setKunciLabel] = useState('nama');
  const [kunciNilai, setKunciNilai] = useState('nilai');
  const [kunciTahun, setKunciTahun] = useState('tahun');
  const [isProyeksiWide, setIsProyeksiWide] = useState(false);
  const [daftarVariabelProyeksi, setDaftarVariabelProyeksi] = useState([]);
  const [variabelProyeksiAktif, setVariabelProyeksiAktif] = useState('');
  const [historisRegresi, setHistorisRegresi] = useState(null);
  const [modelRegresiJson, setModelRegresiJson] = useState(null);
  const [opsiJenjang, setOpsiJenjang] = useState([]);
  const [jenjangAktif, setJenjangAktif] = useState('');
  const [ringkasanUtama, setRingkasanUtama] = useState({
    totalWilayah: 0,
    baik: 0,
    perluPeningkatan: 0,
    benar: 0,
    salah: 0,
    akurasi: 0,
    tahunTerbaru: ''
  });

  const [rawClusteringData, setRawClusteringData] = useState([]);
  const [rawKlasifikasiData, setRawKlasifikasiData] = useState([]);

  const menuKlasifikasi = [
    { label: "Kondisi Pendidikan Tiap Wilayah", path: "/data/klasifikasi/hasil_klasifikasi.csv" },
    { label: "Wilayah Prioritas Perhatian Pendidikan", path: "/data/klasifikasi/hasil_klasifikasi_prioritas.csv" },
    { label: "Jenjang Paling Kekurangan Guru", path: "/data/klasifikasi/hasil_klasifikasi_jenjang_terlemah.csv" },
    { label: "Kondisi Guru per Jenjang Sekolah", path: "/data/klasifikasi/hasil_klasifikasi_per_jenjang.csv" },
    { label: "Tren Kemajuan Pendidikan Tiap Wilayah", path: "/data/klasifikasi/hasil_klasifikasi_tren.csv" }
  ];

  const menuRegresi = [
    { label: "Proyeksi Skenario C", path: "/data/regresi/hasil_proyeksi_skenario_c.csv" },
  ];

  const menuClustering = [
    { label: 'Tema 1 - Rasio Sekolah & Guru', path: '/data/clustering/hasil_cluster_tema1.csv' },
    { label: 'Tema 2 - Jumlah Sekolah, Guru, Murid', path: '/data/clustering/hasil_cluster_tema2.csv' },
    { label: 'Tema 3 - Proporsi & Rasio Sekolah Swasta', path: '/data/clustering/hasil_cluster_tema3.csv' },
    { label: 'Tema 4 - Proporsi SMA & SMK (Sekolah Menengah)', path: '/data/clustering/hasil_cluster_tema4.csv' },
    { label: 'Tema 5 - Proporsi Sekolah Dasar (SD)', path: '/data/clustering/hasil_cluster_tema5.csv' }
  ];

  const keteranganClustering = {
    '/data/clustering/hasil_cluster_tema1.csv': [
      {
        cluster: 'Cluster 0',
        ringkasan: 'Wilayah dengan rasio murid/guru dan murid/sekolah yang relatif rendah, menandakan sebaran guru yang lebih memadai dan kondisi belajar mengajar yang lebih kondusif.'
      },
      {
        cluster: 'Cluster 1',
        ringkasan: 'Wilayah dengan rasio murid/guru dan murid/sekolah yang tinggi, mengindikasikan beban mengajar guru yang lebih berat serta potensi kepadatan kelas yang lebih tinggi.'
      }
    ],
    '/data/clustering/hasil_cluster_tema2.csv': [
      {
        cluster: 'Cluster 0',
        ringkasan: 'Wilayah dengan skala aktivitas pendidikan kecil hingga menengah, dicirikan oleh jumlah sekolah, guru, dan murid yang relatif lebih sedikit.'
      },
      {
        cluster: 'Cluster 1',
        ringkasan: 'Wilayah dengan skala aktivitas pendidikan sangat besar, dicirikan oleh jumlah sebaran sekolah, guru, dan populasi murid yang melimpah.'
      }
    ],
    '/data/clustering/hasil_cluster_tema3.csv': [
      {
        cluster: 'Cluster 0',
        ringkasan: 'Wilayah dengan proporsi sekolah swasta yang relatif lebih tinggi, menunjukkan peran yayasan/sektor swasta yang lebih kuat dalam layanan pendidikan.'
      },
      {
        cluster: 'Cluster 1',
        ringkasan: 'Wilayah didominasi oleh sekolah negeri, di mana proporsi sekolah, murid, dan guru swasta cenderung sangat rendah.'
      }
    ],
    '/data/clustering/hasil_cluster_tema4.csv': [
      {
        cluster: 'Cluster 0',
        ringkasan: 'Wilayah dengan dominasi kuat Sekolah Menengah Atas (SMA) dibandingkan Sekolah Menengah Kejuruan (SMK) pada jumlah sekolah, guru, dan murid.'
      },
      {
        cluster: 'Cluster 1',
        ringkasan: 'Wilayah perkotaan dengan komposisi SMA dan SMK yang relatif berimbang atau dengan proporsi SMK yang lebih menonjol.'
      }
    ],
    '/data/clustering/hasil_cluster_tema5.csv': [
      {
        cluster: 'Cluster 0',
        ringkasan: 'Wilayah perkotaan (Kota Banda Aceh, Kota Langsa, Kota Lhokseumawe) dengan proporsi Sekolah Dasar (SD) yang relatif lebih rendah/seimbang (~79,7% sekolah, ~67,4% guru, ~72,7% murid) karena sebaran dan akses jenjang sekolah menengah (SMP/SMA/SMK) lebih merata.'
      },
      {
        cluster: 'Cluster 1',
        ringkasan: 'Wilayah kabupaten & perkotaan berkembang (20 wilayah) dengan proporsi Sekolah Dasar (SD) yang sangat mendominasi (~86,8% sekolah, ~78,6% guru, ~79,4% murid), mengindikasikan konsentrasi fasilitas pendidikan masih berpusat pada jenjang dasar.'
      }
    ]
  };

  const modulAnalitik = [
    { nama: 'Klasifikasi', status: 'Aktif', keterangan: 'Pemetaan prioritas bantuan berdasarkan indikator pendidikan.' },
    { nama: 'Clustering', status: 'Aktif', keterangan: 'Pengelompokan wilayah berdasarkan kemiripan karakteristik kondisi pendidikan.' },
    { nama: 'Regresi', status: 'Aktif', keterangan: 'Proyeksi tren indikator lintas bidang ke depan.' }
  ];

  useEffect(() => {
    // Klasifikasi
    Papa.parse('/data/klasifikasi/hasil_klasifikasi.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (hasil) => {
        const baris = hasil.data.filter((row) => row && row.kabupaten_kota);
        const mapTerbaru = new Map();
        baris.forEach((row) => {
          const label = String(row.kabupaten_kota ?? '').trim();
          const tahun = Number(row.tahun ?? 0);
          const lama = mapTerbaru.get(label);
          if (label && (!lama || tahun >= Number(lama.tahun ?? 0))) {
            mapTerbaru.set(label, row);
          }
        });
        const terbaru = Array.from(mapTerbaru.values());
        const total = terbaru.length;
        const baik = terbaru.filter((row) => String(row.Label_RLS ?? '') === 'Baik').length;
        setRingkasanGabungan((prev) => ({
          ...prev,
          klasifikasi: { total, baik, perluPeningkatan: total - baik }
        }));
      },
      error: () => setRingkasanGabungan((prev) => ({ ...prev, klasifikasi: null }))
    });

    // Clustering
    Papa.parse('/data/clustering/hasil_cluster_tema1.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (hasil) => {
        const baris = hasil.data.filter((row) => row && row.cluster !== undefined && row.cluster !== null);
        const totalWilayah = baris.length;
        const jumlahCluster = new Set(baris.map((row) => String(row.cluster))).size;
        setRingkasanGabungan((prev) => ({
          ...prev,
          clustering: { totalWilayah, jumlahCluster }
        }));
      },
      error: () => setRingkasanGabungan((prev) => ({ ...prev, clustering: null }))
    });

    // Regresi Model JSON
    fetch('/data/regresi/model_regresi_skenario_c.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          setRingkasanGabungan((prev) => ({ ...prev, regresi: null }));
          return;
        }
        setModelRegresiJson(data);
        const daftar = Object.entries(data);
        const naik = daftar.filter(([, v]) => v.slope > 0).length;
        const rataR2 = daftar.reduce((total, [, v]) => total + v.r2, 0) / (daftar.length || 1);
        setRingkasanGabungan((prev) => ({
          ...prev,
          regresi: { totalIndikator: daftar.length, naik, rataR2 }
        }));
      })
      .catch(() => setRingkasanGabungan((prev) => ({ ...prev, regresi: null })));
  }, []);

  useEffect(() => {
    fetch('/data/regresi/data_historis_skenario_c.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHistorisRegresi(data))
      .catch(() => setHistorisRegresi(null));
  }, []);

  useEffect(() => {
    Papa.parse(csvAktif, {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: function (results) {
        setRawClusteringData([]);
        const dataBersih = results.data.filter((row) => {
          if (!row || Object.keys(row).length === 0) {
            return false;
          }

          return Object.values(row).some((nilai) => {
            if (nilai === null || nilai === undefined) {
              return false;
            }
            return String(nilai).trim() !== '';
          });
        });

        const kolom = Object.keys(dataBersih[0] ?? {});

        const modePerJenjang = csvAktif.includes('hasil_klasifikasi_per_jenjang');
        const modeJenjangTerlemah = csvAktif.includes('hasil_klasifikasi_jenjang_terlemah');
        const modeKlasifikasiTren = csvAktif.includes('hasil_klasifikasi_tren');
        const modePrioritasBantuan = csvAktif.includes('hasil_klasifikasi_prioritas');
        const modeClustering = csvAktif.includes('/data/clustering/');
        const modeHasilKeseluruhan = csvAktif.includes('hasil_klasifikasi.csv') && !modePerJenjang && !modeJenjangTerlemah && !modeKlasifikasiTren;

        if (modeClustering) {
          setRawClusteringData(dataBersih);
          const ringkasanCluster = new Map();

          dataBersih.forEach((row) => {
            const cluster = String(row.cluster ?? '').trim();
            if (!cluster) {
              return;
            }

            ringkasanCluster.set(cluster, (ringkasanCluster.get(cluster) ?? 0) + 1);
          });

          const dataTransform = Array.from(ringkasanCluster.entries())
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([cluster, jumlah]) => ({ cluster: formatCluster(cluster), jumlah_wilayah: jumlah }));

          setOpsiJenjang([]);
          setJenjangAktif('');
          setKunciLabel('cluster');
          setKunciNilai('jumlah_wilayah');
          setKunciTahun('');
          setIsProyeksiWide(false);
          setDaftarVariabelProyeksi([]);
          setVariabelProyeksiAktif('');
          setDataGrafik(dataTransform);
          return;
        }

        if (!modeClustering) {
          setRawKlasifikasiData(dataBersih);
        }

        if (modeHasilKeseluruhan) {
          const mapTerbaru = new Map();

          dataBersih.forEach((row) => {
            const label = String(row.kabupaten_kota ?? '').trim();
            const tahun = Number(row.tahun ?? 0);
            const dataLama = mapTerbaru.get(label);

            if (!label) {
              return;
            }

            if (!dataLama || tahun >= Number(dataLama.tahun ?? 0)) {
              mapTerbaru.set(label, row);
            }
          });

          const terbaru = Array.from(mapTerbaru.values());
          const totalWilayah = terbaru.length;
          const baik = terbaru.filter((row) => String(row.Label_RLS ?? '') === 'Baik').length;
          const perluPeningkatan = totalWilayah - baik;
          const benar = terbaru.filter((row) => String(row.Prediksi_Benar ?? '').toLowerCase() === 'true').length;
          const salah = totalWilayah - benar;
          const akurasi = totalWilayah > 0 ? Math.round((benar / totalWilayah) * 100) : 0;
          const tahunTerbaru = terbaru.reduce((maks, row) => Math.max(maks, Number(row.tahun ?? 0)), 0);

          setRingkasanUtama({
            totalWilayah,
            baik,
            perluPeningkatan,
            benar,
            salah,
            akurasi,
            tahunTerbaru: tahunTerbaru ? String(tahunTerbaru) : ''
          });

          const dataTransform = [
            { label: 'Wilayah Baik', jumlah: baik },
            { label: 'Perlu Peningkatan', jumlah: perluPeningkatan },
            { label: 'Prediksi Benar', jumlah: benar },
            { label: 'Prediksi Salah', jumlah: salah }
          ];

          setOpsiJenjang([]);
          setJenjangAktif('');
          setKunciLabel('label');
          setKunciNilai('jumlah');
          setKunciTahun('');
          setIsProyeksiWide(false);
          setDaftarVariabelProyeksi([]);
          setVariabelProyeksiAktif('');
          setDataGrafik(dataTransform);
          return;
        }

        if (modePrioritasBantuan) {
          const mapTerbaru = new Map();

          dataBersih.forEach((row) => {
            const label = String(row.kabupaten_kota ?? '').trim();
            const tahun = Number(row.tahun ?? 0);
            const dataLama = mapTerbaru.get(label);

            if (!label) {
              return;
            }

            if (!dataLama || tahun >= Number(dataLama.tahun ?? 0)) {
              mapTerbaru.set(label, row);
            }
          });

          const terbaru = Array.from(mapTerbaru.values());
          const totalWilayah = terbaru.length;
          const tinggi = terbaru.filter((row) => String(row.Label_Prioritas ?? '') === 'Prioritas Tinggi').length;
          const sedang = terbaru.filter((row) => String(row.Label_Prioritas ?? '') === 'Prioritas Sedang').length;
          const rendah = terbaru.filter((row) => String(row.Label_Prioritas ?? '') === 'Prioritas Rendah').length;
          const cocok = terbaru.filter((row) => String(row.Label_Prioritas ?? '') === String(row.Prediksi_Label_Prioritas ?? '')).length;
          const tahunTerbaru = terbaru.reduce((maks, row) => Math.max(maks, Number(row.tahun ?? 0)), 0);

          setRingkasanUtama({
            totalWilayah,
            baik: tinggi,
            perluPeningkatan: rendah,
            benar: cocok,
            salah: totalWilayah - cocok,
            akurasi: totalWilayah > 0 ? Math.round((cocok / totalWilayah) * 100) : 0,
            tahunTerbaru: tahunTerbaru ? String(tahunTerbaru) : ''
          });

          const dataTransform = [
            { label: 'Prioritas Tinggi', jumlah: tinggi },
            { label: 'Prioritas Sedang', jumlah: sedang },
            { label: 'Prioritas Rendah', jumlah: rendah }
          ];

          setOpsiJenjang([]);
          setJenjangAktif('');
          setKunciLabel('label');
          setKunciNilai('jumlah');
          setKunciTahun('');
          setIsProyeksiWide(false);
          setDaftarVariabelProyeksi([]);
          setVariabelProyeksiAktif('');
          setDataGrafik(dataTransform);
          return;
        }

        if (modePerJenjang) {
          const daftarKolomJenjang = kolom
            .filter((namaKolom) => namaKolom.startsWith('rasio_murid_per_guru_'))
            .map((namaKolom) => {
              const kode = namaKolom.replace('rasio_murid_per_guru_', '').toUpperCase();
              return { label: kode, value: namaKolom };
            });

          const defaultJenjang = daftarKolomJenjang[0]?.value ?? 'rasio_murid_per_guru_sd';
          const jenjangFinal = daftarKolomJenjang.some((item) => item.value === jenjangAktif)
            ? jenjangAktif
            : defaultJenjang;

          setOpsiJenjang(daftarKolomJenjang);
          setJenjangAktif(jenjangFinal);
          setKunciLabel('kabupaten_kota');
          setKunciNilai(jenjangFinal);
          setKunciTahun('tahun');
          setIsProyeksiWide(false);
          setDaftarVariabelProyeksi([]);
          setVariabelProyeksiAktif('');
          setDataGrafik(dataBersih);
          return;
        }

        if (modeJenjangTerlemah) {
          const mapTerbaru = new Map();

          dataBersih.forEach((row) => {
            const label = String(row.kabupaten_kota ?? '').trim();
            const tahun = Number(row.tahun ?? 0);
            const dataLama = mapTerbaru.get(label);

            if (!label) {
              return;
            }

            if (!dataLama || tahun >= Number(dataLama.tahun ?? 0)) {
              mapTerbaru.set(label, row);
            }
          });

          const ringkasan = { SD: 0, SMP: 0, SMA: 0, SMK: 0 };
          mapTerbaru.forEach((row) => {
            const jenjang = String(row.Jenjang_Terlemah ?? '').toUpperCase();
            if (ringkasan[jenjang] !== undefined) {
              ringkasan[jenjang] += 1;
            }
          });

          const dataTransform = Object.entries(ringkasan)
            .map(([jenjang, jumlah]) => ({ jenjang, jumlah_wilayah: jumlah }))
            .filter((item) => item.jumlah_wilayah > 0);

          setOpsiJenjang([]);
          setJenjangAktif('');
          setKunciLabel('jenjang');
          setKunciNilai('jumlah_wilayah');
          setKunciTahun('');
          setIsProyeksiWide(false);
          setDaftarVariabelProyeksi([]);
          setVariabelProyeksiAktif('');
          setDataGrafik(dataTransform);
          return;
        }

        if (modeKlasifikasiTren) {
          const ringkasan = { Membaik: 0, Stagnan: 0, Menurun: 0 };

          dataBersih.forEach((row) => {
            const labelTren = String(row.label_tren ?? '').trim();
            if (ringkasan[labelTren] !== undefined) {
              ringkasan[labelTren] += 1;
            }
          });

          const dataTransform = Object.entries(ringkasan)
            .map(([tren, jumlah]) => ({ tren, jumlah_wilayah: jumlah }))
            .filter((item) => item.jumlah_wilayah > 0);

          setOpsiJenjang([]);
          setJenjangAktif('');
          setKunciLabel('tren');
          setKunciNilai('jumlah_wilayah');
          setKunciTahun('');
          setIsProyeksiWide(false);
          setDaftarVariabelProyeksi([]);
          setVariabelProyeksiAktif('');
          setDataGrafik(dataTransform);
          return;
        }

        setOpsiJenjang([]);
        setJenjangAktif('');

        const label = pilihKunci(kolom, ['nama', 'kabupaten_kota', 'wilayah', 'kategori', 'Variabel']);
        let nilai = pilihKunci(kolom, ['nilai', 'jumlah_perlu_peningkatan', 'rls__nilai', 'prediksi', 'R2']);
        const tahun = pilihKunci(kolom, ['tahun', 'year'], 'tahun');

        if (!nilai) {
          nilai = kolom.find((kunci) => dataBersih.some((row) => Number.isFinite(Number(row[kunci])) && kunci !== tahun));
        }

        const kolomProyeksi = kolom.filter((namaKolom) => ambilTahunProyeksi(namaKolom) !== null);
        const modeProyeksiWide = kolomProyeksi.length > 0;

        if (modeProyeksiWide) {
          const labelProyeksi = pilihKunci(kolom, ['Variabel', 'variabel', 'nama_variabel'], 'Variabel');
          const variabelUnik = Array.from(
            new Set(
              dataBersih
                .map((row) => String(row[labelProyeksi] ?? '').trim())
                .filter(Boolean)
            )
          );

          setIsProyeksiWide(true);
          setDaftarVariabelProyeksi(variabelUnik);
          setVariabelProyeksiAktif((sebelumnya) => {
            if (variabelUnik.length === 0) {
              return '';
            }
            return variabelUnik.includes(sebelumnya) ? sebelumnya : variabelUnik[0];
          });
          setKunciLabel(labelProyeksi);
          setKunciNilai('prediksi');
          setKunciTahun('tahun');
        } else {
          setIsProyeksiWide(false);
          setDaftarVariabelProyeksi([]);
          setVariabelProyeksiAktif('');
          setKunciLabel(label || kolom[0] || 'nama');
          setKunciNilai(nilai || kolom[1] || 'nilai');
          setKunciTahun(tahun);
        }

        setDataGrafik(dataBersih);
      },
      error: function () {
        setDataGrafik([]);
      }
    });
  }, [csvAktif, jenjangAktif]);

  const dataTampil = useMemo(() => {
    if (halamanAktif === 'proyeksi' && isProyeksiWide) {
      const dataVariabel = dataGrafik.find(
        (row) => String(row[kunciLabel] ?? '').trim() === variabelProyeksiAktif
      );

      if (!dataVariabel) {
        return [];
      }

      const seriTahun = Object.keys(dataVariabel)
        .map((namaKolom) => {
          const tahun = ambilTahunProyeksi(namaKolom);
          if (!tahun) {
            return null;
          }

          const nilaiMentah = dataVariabel[namaKolom];
          if (nilaiMentah === null || nilaiMentah === undefined || nilaiMentah === '') {
            return null;
          }

          const nilai = Number(nilaiMentah);
          if (!Number.isFinite(nilai)) {
            return null;
          }

          return { tahun, prediksi: nilai };
        })
        .filter(Boolean)
        .sort((a, b) => a.tahun - b.tahun);

      const kata = kataKunci.trim().toLowerCase();
      if (kata && !variabelProyeksiAktif.toLowerCase().includes(kata)) {
        return [];
      }

      const kunciHistoris = variabelProyeksiAktif.split(' (')[0].trim().replace(/\s+/g, '_');
      const dataHistorisVariabel = historisRegresi ? historisRegresi[kunciHistoris] : null;

      if (dataHistorisVariabel && dataHistorisVariabel.length > 0) {
        const titikHistoris = [...dataHistorisVariabel]
          .sort((a, b) => a.tahun - b.tahun)
          .map((row) => ({ tahun: row.tahun, aktual: row.nilai }));

        const tahunHistorisTerakhir = titikHistoris[titikHistoris.length - 1].tahun;
        const nilaiHistorisTerakhir = titikHistoris[titikHistoris.length - 1].aktual;

        const titikProyeksi = [
          { tahun: tahunHistorisTerakhir, proyeksi: nilaiHistorisTerakhir },
          ...seriTahun
            .filter((titik) => titik.tahun > tahunHistorisTerakhir)
            .map((titik) => ({ tahun: titik.tahun, proyeksi: titik.prediksi }))
        ];

        return [...titikHistoris, ...titikProyeksi];
      }

      return seriTahun.map((titik) => ({ tahun: titik.tahun, proyeksi: titik.prediksi }));
    }

    const kata = kataKunci.trim().toLowerCase();

    const dataFilter = kata
      ? dataGrafik.filter((row) =>
        Object.values(row).some((nilai) =>
          String(nilai ?? '').toLowerCase().includes(kata)
        )
      )
      : [...dataGrafik];

    if (kategoriUtama === 'clustering') {
      return [...dataFilter].sort((a, b) => {
        const numA = parseInt(String(a.cluster ?? '').replace(/\D/g, ''), 10);
        const numB = parseInt(String(b.cluster ?? '').replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return String(a.cluster ?? '').localeCompare(String(b.cluster ?? ''), 'id');
      });
    }

    if (halamanAktif === 'proyeksi') {
      return dataFilter.sort((a, b) => Number(a[kunciTahun] ?? 0) - Number(b[kunciTahun] ?? 0));
    }

    let dataEvaluasi = [...dataFilter];

    if (kunciLabel && kunciTahun) {
      const mapTerbaru = new Map();

      dataFilter.forEach((row) => {
        const label = String(row[kunciLabel] ?? '').trim();
        const tahun = Number(row[kunciTahun] ?? 0);
        const dataLama = mapTerbaru.get(label);

        if (!label) {
          return;
        }

        if (!dataLama || tahun >= Number(dataLama[kunciTahun] ?? 0)) {
          mapTerbaru.set(label, row);
        }
      });

      if (mapTerbaru.size > 0) {
        dataEvaluasi = Array.from(mapTerbaru.values());
      }
    }

    if (modeUrut === 'alfabet') {
      return dataEvaluasi.sort((a, b) => String(a[kunciLabel] ?? '').localeCompare(String(b[kunciLabel] ?? ''), 'id'));
    }

    return dataEvaluasi.sort((a, b) => Number(b[kunciNilai] ?? 0) - Number(a[kunciNilai] ?? 0));
  }, [
    dataGrafik,
    halamanAktif,
    historisRegresi,
    isProyeksiWide,
    kataKunci,
    kunciLabel,
    kunciNilai,
    kunciTahun,
    modeUrut,
    variabelProyeksiAktif
  ]);

  const menuAktif = kategoriUtama === 'clustering'
    ? menuClustering
    : (halamanAktif === 'evaluasi' ? menuKlasifikasi : menuRegresi);
  const sedangClustering = kategoriUtama === 'clustering';
  const sedangPrioritasBantuan = csvAktif.includes('hasil_klasifikasi_prioritas');
  const sedangPerJenjang = csvAktif.includes('hasil_klasifikasi_per_jenjang');
  const sedangJenjangTerlemah = csvAktif.includes('hasil_klasifikasi_jenjang_terlemah');
  const sedangKlasifikasiTren = csvAktif.includes('hasil_klasifikasi_tren');
  const sedangHasilKeseluruhan = csvAktif.includes('hasil_klasifikasi.csv') && !sedangPerJenjang && !sedangJenjangTerlemah && !sedangKlasifikasiTren && !sedangPrioritasBantuan;

  const ringkasanClustering = useMemo(() => {
    if (!sedangClustering) {
      return null;
    }

    const totalWilayah = dataGrafik.reduce((total, row) => total + Number(row.jumlah_wilayah ?? 0), 0);
    const cluster0 = Number(dataGrafik.find((row) => row.cluster === 'Cluster 0')?.jumlah_wilayah ?? 0);
    const cluster1 = Number(dataGrafik.find((row) => row.cluster === 'Cluster 1')?.jumlah_wilayah ?? 0);
    const clusterDominan = [...dataGrafik].sort((a, b) => Number(b.jumlah_wilayah ?? 0) - Number(a.jumlah_wilayah ?? 0))[0];

    return {
      totalWilayah,
      cluster0,
      cluster1,
      clusterDominan: clusterDominan?.cluster ?? '-',
      clusterDominanCount: Number(clusterDominan?.jumlah_wilayah ?? 0)
    };
  }, [dataGrafik, sedangClustering]);

  const ringkasanJenjangTerlemah = useMemo(() => {
    if (!sedangJenjangTerlemah || dataGrafik.length === 0) return null;
    const totalWilayah = dataGrafik.reduce((sum, row) => sum + Number(row.jumlah_wilayah ?? 0), 0);
    const dominan = [...dataGrafik].sort((a, b) => Number(b.jumlah_wilayah ?? 0) - Number(a.jumlah_wilayah ?? 0))[0];
    return {
      totalWilayah,
      jenjangDominan: dominan?.jenjang ?? '-',
      jenjangDominanCount: Number(dominan?.jumlah_wilayah ?? 0)
    };
  }, [dataGrafik, sedangJenjangTerlemah]);

  const ringkasanPerJenjang = useMemo(() => {
    if (!sedangPerJenjang || dataGrafik.length === 0) return null;
    const terbaru = new Map();
    dataGrafik.forEach((row) => {
      const wilayah = String(row.kabupaten_kota ?? '').trim();
      const tahun = Number(row.tahun ?? 0);
      if (!wilayah) return;
      const lama = terbaru.get(wilayah);
      if (!lama || tahun >= Number(lama.tahun ?? 0)) terbaru.set(wilayah, row);
    });
    const arr = Array.from(terbaru.values());
    const totalWilayah = arr.length;
    const jenjangLabel = jenjangAktif.replace('rasio_murid_per_guru_', '').toUpperCase();
    const labelKolom = `Label_${jenjangLabel}`;
    const predKolom = `Prediksi_Label_${jenjangLabel}`;
    const perluPeningkatan = arr.filter((r) => String(r[labelKolom] ?? '') === 'Perlu Peningkatan').length;
    const cocok = arr.filter((r) => String(r[labelKolom] ?? '') === String(r[predKolom] ?? '')).length;
    const akurasi = totalWilayah > 0 ? Math.round((cocok / totalWilayah) * 100) : 0;
    return { totalWilayah, perluPeningkatan, cocok, akurasi, jenjangLabel };
  }, [dataGrafik, sedangPerJenjang, jenjangAktif]);

  const ringkasanTren = useMemo(() => {
    if (!sedangKlasifikasiTren || dataGrafik.length === 0) return null;
    const membaik = Number(dataGrafik.find((r) => r.tren === 'Membaik')?.jumlah_wilayah ?? 0);
    const stagnan = Number(dataGrafik.find((r) => r.tren === 'Stagnan')?.jumlah_wilayah ?? 0);
    const menurun = Number(dataGrafik.find((r) => r.tren === 'Menurun')?.jumlah_wilayah ?? 0);
    const total = membaik + stagnan + menurun;
    return { total, membaik, stagnan, menurun };
  }, [dataGrafik, sedangKlasifikasiTren]);

  const keteranganClusteringAktif = useMemo(() => {
    if (!sedangClustering) {
      return [];
    }

    const keteranganTema = keteranganClustering[csvAktif] ?? [];
    const hitungan = new Map(dataGrafik.map((item) => [item.cluster, item.jumlah_wilayah]));

    return keteranganTema.map((item) => ({
      ...item,
      jumlah_wilayah: hitungan.get(item.cluster) ?? 0
    }));
  }, [csvAktif, dataGrafik, sedangClustering]);

  const gantiKategoriUtama = (kategori) => {
    setKategoriUtama(kategori);
    setKataKunci('');
    setSedangRingkasanUtama(false);

    if (kategori === 'clustering') {
      setHalamanAktif('evaluasi');
      setTampilanRegresi('grafik');
      setCsvAktif(menuClustering[0].path);
      return;
    }

    setHalamanAktif('evaluasi');
    setCsvAktif('/data/klasifikasi/hasil_klasifikasi.csv');
  };

  const jumlahDataset = new Intl.NumberFormat('id-ID').format(dataTampil.length);

  // Helper Pemformatan Khusus Regresi Lintas Grafik Historis
  const metaRegresiAktif = METADATA_INDIKATOR_APP[variabelProyeksiAktif] || { satuan: '', tipe: 'desimal' };

  const formatAngkaRegresi = (v) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return v;
    if (metaRegresiAktif.tipe === 'jumlah') {
      return new Intl.NumberFormat('id-ID').format(Math.round(v));
    }
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  };

  // Kalkulasi Otomatis Deskripsi Simpulan Grafik Historis Regresi
  const simpulanGrafikHistoris = useMemo(() => {
    if (halamanAktif !== 'proyeksi' || !dataTampil || dataTampil.length === 0) return null;

    const titikAktual = dataTampil.filter((d) => typeof d.aktual === 'number');
    const titikProyeksi = dataTampil.filter((d) => typeof d.proyeksi === 'number');

    if (titikAktual.length === 0) return null;

    const awalAktual = titikAktual[0];
    const akhirAktual = titikAktual[titikAktual.length - 1];
    const akhirProyeksi = titikProyeksi[titikProyeksi.length - 1];

    const modelInfo = modelRegresiJson ? modelRegresiJson[variabelProyeksiAktif] : null;
    const r2Val = modelInfo ? modelInfo.r2 : null;

    const selisihHistoris = akhirAktual.aktual - awalAktual.aktual;
    const persentaseHistoris = ((selisihHistoris / awalAktual.aktual) * 100).toFixed(1);
    const arahHistoris = selisihHistoris >= 0 ? 'peningkatan' : 'penurunan';

    let teksSimpulan = `Berdasarkan data historis tahun ${awalAktual.tahun}–${akhirAktual.tahun}, indikator **${variabelProyeksiAktif}** mengalami ${arahHistoris} sebesar **${Math.abs(persentaseHistoris)}%** (dari ${formatAngkaRegresi(awalAktual.aktual)} ${metaRegresiAktif.satuan} menjadi ${formatAngkaRegresi(akhirAktual.aktual)} ${metaRegresiAktif.satuan}).`;

    if (akhirProyeksi) {
      const selisihProyeksi = akhirProyeksi.proyeksi - akhirAktual.aktual;
      const arahProyeksi = selisihProyeksi >= 0 ? 'meningkat' : 'menurun';
      teksSimpulan += ` Menggunakan pemodelan regresi linear, nilai indikator ini diproyeksikan terus ${arahProyeksi} hingga mencapai **${formatAngkaRegresi(akhirProyeksi.proyeksi)} ${metaRegresiAktif.satuan}** pada tahun ${akhirProyeksi.tahun}.`;
    }

    return {
      teks: teksSimpulan,
      r2: r2Val,
      sumber: "Badan Pusat Statistik (BPS) Provinsi Aceh"
    };
  }, [dataTampil, halamanAktif, variabelProyeksiAktif, metaRegresiAktif, modelRegresiJson]);

  const renderGrafik = () => {
    if (sedangClustering) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataTampil} layout="vertical" margin={{ top: 10, right: 26, left: 22, bottom: 6 }}>
            <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#ebeef3" />
            <XAxis
              type="number"
              tickFormatter={formatAngkaRapi}
              tick={{ fill: '#657188' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="cluster"
              type="category"
              width={140}
              tick={{ fontSize: 12, fill: '#667085' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={formatAngkaRapi}
              cursor={{ fill: '#f7f8fb' }}
              contentStyle={{ borderRadius: '10px', borderColor: '#e8ebf0' }}
            />
            <Bar dataKey="jumlah_wilayah" name="Jumlah Wilayah" fill="#eb2b39" barSize={24} radius={[0, 7, 7, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (halamanAktif === 'evaluasi') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataTampil} layout="vertical" margin={{ top: 6, right: 26, left: 30, bottom: 6 }}>
            <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#ebeef3" />
            <XAxis
              type="number"
              tickFormatter={formatAngkaRapi}
              tick={{ fill: '#657188' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey={kunciLabel}
              type="category"
              width={180}
              tick={{ fontSize: 12, fill: '#667085' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={formatAngkaRapi}
              cursor={{ fill: '#f7f8fb' }}
              contentStyle={{ borderRadius: '10px', borderColor: '#e8ebf0' }}
            />
            <Bar dataKey={kunciNilai} fill="#eb2b39" barSize={18} radius={[0, 7, 7, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (isProyeksiWide) {
      const nilaiValid = dataTampil
        .flatMap((d) => [d.aktual, d.proyeksi])
        .filter((v) => typeof v === 'number' && Number.isFinite(v));

      let domainY = ['auto', 'auto'];
      if (nilaiValid.length > 0) {
        const nilaiMin = Math.min(...nilaiValid);
        const nilaiMax = Math.max(...nilaiValid);
        const jarak = nilaiMax - nilaiMin;
        const padding = jarak > 0 ? jarak * 0.2 : Math.abs(nilaiMax) * 0.05 || 1;
        domainY = [nilaiMin - padding, nilaiMax + padding];
      }

      const adaDataHistoris = dataTampil.some((d) => typeof d.aktual === 'number');

      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataTampil} margin={{ top: 16, right: 24, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#ebeef3" />
            <XAxis dataKey="tahun" tick={{ fill: '#657188' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#657188' }}
              axisLine={false}
              tickLine={false}
              domain={domainY}
              allowDecimals
              tickFormatter={formatAngkaRegresi}
            />
            <Tooltip
              formatter={(v) => [`${formatAngkaRegresi(v)} ${metaRegresiAktif.satuan}`, variabelProyeksiAktif]}
              contentStyle={{ borderRadius: '10px', borderColor: '#e8ebf0' }}
            />
            <Legend />
            {adaDataHistoris && (
              <Line
                type="monotone"
                dataKey="aktual"
                name={`Data Historis Asli (${metaRegresiAktif.satuan})`}
                stroke="#2a78d6"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="proyeksi"
              name={`Garis Proyeksi (${metaRegresiAktif.satuan})`}
              stroke="#eb2b39"
              strokeWidth={2.5}
              strokeDasharray={adaDataHistoris ? '6 4' : undefined}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dataTampil} margin={{ top: 16, right: 24, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#ebeef3" />
          <XAxis dataKey={kunciTahun} tick={{ fill: '#657188' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#657188' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: '10px', borderColor: '#e8ebf0' }} />
          <Legend />
          <Line
            type="monotone"
            dataKey={kunciNilai}
            name="Nilai Proyeksi"
            stroke="#eb2b39"
            strokeWidth={3}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p className="brand-title">DATA MINING HUB</p>
            <p className="brand-subtitle">Diskominsa</p>
          </div>
        </div>

        <nav className="site-nav" aria-label="Navigasi utama">
          <button
            className={sedangRingkasanUtama ? 'nav-link active' : 'nav-link'}
            onClick={() => setSedangRingkasanUtama(true)}
          >
            Ringkasan
          </button>
          <button
            className={!sedangRingkasanUtama && kategoriUtama === 'sekolah' && !sedangClustering && halamanAktif !== 'proyeksi' ? 'nav-link active' : 'nav-link'}
            onClick={() => gantiKategoriUtama('sekolah')}
          >
            Klasifikasi
          </button>
          <button
            className={!sedangRingkasanUtama && sedangClustering ? 'nav-link active' : 'nav-link'}
            onClick={() => gantiKategoriUtama('clustering')}
          >
            Clustering
          </button>
          <button
            className={!sedangRingkasanUtama && kategoriUtama === 'sekolah' && halamanAktif === 'proyeksi' ? 'nav-link active' : 'nav-link'}
            onClick={() => {
              gantiKategoriUtama('sekolah');
              setHalamanAktif('proyeksi');
              setCsvAktif('/data/regresi/hasil_proyeksi_skenario_c.csv');
            }}
          >
            Regresi
          </button>
        </nav>
      </header>

      <main className="page-content">
        <section className="section-title">
          <span className="section-dot" aria-hidden="true" />
          <h1>Dashboard Ringkasan Data Mining Pendidikan Aceh</h1>
        </section>

        {sedangRingkasanUtama ? (
          <section className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="results-panel">
              <p className="panel-subtitle" style={{ marginBottom: 20 }}>
                Rangkuman simpulan dari ketiga skenario data mining pendidikan Provinsi Aceh — Klasterisasi, Klasifikasi, dan Regresi.
              </p>

              <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <article className="kpi-card accent">
                  <span>Klasifikasi — Wilayah Perlu Perhatian</span>
                  <strong>
                    {ringkasanGabungan.klasifikasi
                      ? `${ringkasanGabungan.klasifikasi.perluPeningkatan} / ${ringkasanGabungan.klasifikasi.total}`
                      : 'Memuat...'}
                  </strong>
                  <small>Kabupaten/kota berlabel "Perlu Peningkatan"</small>
                </article>
                <article className="kpi-card accent">
                  <span>Clustering — Wilayah Terpetakan</span>
                  <strong>
                    {ringkasanGabungan.clustering
                      ? `${ringkasanGabungan.clustering.totalWilayah} wilayah`
                      : 'Memuat...'}
                  </strong>
                  <small>{ringkasanGabungan.clustering ? `${ringkasanGabungan.clustering.jumlahCluster} cluster terbentuk` : ''}</small>
                </article>
                <article className="kpi-card accent">
                  <span>Regresi — Indikator Tren Naik</span>
                  <strong>
                    {ringkasanGabungan.regresi
                      ? `${ringkasanGabungan.regresi.naik} / ${ringkasanGabungan.regresi.totalIndikator}`
                      : 'Memuat...'}
                  </strong>
                  <small>{ringkasanGabungan.regresi ? `Rata-rata R\u00b2 model: ${ringkasanGabungan.regresi.rataR2.toFixed(3)}` : ''}</small>
                </article>
              </div>

              <div className="module-list">
                <article className="module-item">
                  <header>
                    <h4>Klasifikasi</h4>
                    <span className="status-chip active">Prioritas Bantuan</span>
                  </header>
                  <p>
                    Memetakan kabupaten/kota berdasarkan status kualitas pendidikan (Baik / Perlu Peningkatan) untuk menentukan prioritas intervensi kebijakan.
                  </p>
                </article>
                <article className="module-item">
                  <header>
                    <h4>Clustering</h4>
                    <span className="status-chip active">Pengelompokan Wilayah</span>
                  </header>
                  <p>
                    Mengelompokkan wilayah berdasarkan kemiripan pola indikator pendidikan (rasio guru-murid, skala sekolah, proporsi swasta/negeri, dan komposisi jenjang).
                  </p>
                </article>
                <article className="module-item">
                  <header>
                    <h4>Regresi</h4>
                    <span className="status-chip active">Proyeksi Tren</span>
                  </header>
                  <p>
                    Memproyeksikan tren tujuh indikator pendidikan (jumlah murid per jenjang, RLS, HLS, AMH) untuk mendukung perencanaan ke depan.
                  </p>
                </article>
              </div>
            </div>
          </section>
        ) : (
          <section className="dashboard-grid">
            <aside className="filter-panel">
              <h3>Modul Analitik</h3>
              <p className="panel-subtitle">
                Ringkasan hasil olahan untuk bidang {bidangAktif} yang dapat diperluas ke sektor lain.
              </p>
              <p className="data-source">
                Sumber : Badan Pusat Statistik (BPS) Provinsi Aceh
              </p>

              <div className="module-list">
                {modulAnalitik.map((modul) => (
                  <article className="module-item" key={modul.nama}>
                    <header>
                      <h4>{modul.nama}</h4>
                      <span className={modul.status === 'Aktif' ? 'status-chip active' : 'status-chip'}>
                        {modul.status}
                      </span>
                    </header>
                    <p>{modul.keterangan}</p>
                  </article>
                ))}
              </div>

              <button className="filter-item">
                {sedangClustering ? 'Total Wilayah' : 'Ringkasan Entri'}
                <span className="filter-count">
                  {sedangClustering
                    ? new Intl.NumberFormat('id-ID').format(ringkasanClustering?.totalWilayah ?? 0)
                    : new Intl.NumberFormat('id-ID').format(dataGrafik.length)}
                </span>
              </button>
              <button className="filter-item">
                {sedangClustering ? 'Jumlah Cluster' : 'Tipe Model'}
                <span className="filter-count">{sedangClustering ? dataTampil.length : 2}</span>
              </button>

              <>
                <h3 className="subsection-title">Mode Analisis</h3>
                <div className="mode-toggle mode-toggle-triple" role="tablist" aria-label="Mode analisis">
                  <button
                    className={kategoriUtama === 'sekolah' && halamanAktif === 'evaluasi' ? 'mode-btn active' : 'mode-btn'}
                    onClick={() => gantiKategoriUtama('sekolah')}
                  >
                    Klasifikasi
                  </button>
                  <button
                    className={sedangClustering ? 'mode-btn active' : 'mode-btn'}
                    onClick={() => gantiKategoriUtama('clustering')}
                  >
                    Clustering
                  </button>
                  <button
                    className={kategoriUtama === 'sekolah' && halamanAktif === 'proyeksi' ? 'mode-btn active' : 'mode-btn'}
                    onClick={() => {
                      gantiKategoriUtama('sekolah');
                      setHalamanAktif('proyeksi');
                      setCsvAktif('/data/regresi/hasil_proyeksi_skenario_c.csv');
                    }}
                  >
                    Regresi
                  </button>
                </div>
              </>

              {!sedangClustering && halamanAktif === 'proyeksi' && (
                <div className="mode-toggle" role="tablist" aria-label="Tampilan regresi" style={{ marginTop: 8 }}>
                  <button
                    className={tampilanRegresi === 'grafik' ? 'mode-btn active' : 'mode-btn'}
                    onClick={() => setTampilanRegresi('grafik')}
                  >
                    Grafik Historis
                  </button>
                  <button
                    className={tampilanRegresi === 'interaktif' ? 'mode-btn active' : 'mode-btn'}
                    onClick={() => setTampilanRegresi('interaktif')}
                  >
                    Proyeksi Interaktif
                  </button>
                </div>
              )}
            </aside>

            <div className="results-panel">
              {halamanAktif === 'proyeksi' && tampilanRegresi === 'interaktif' ? (
                <ProyeksiInteraktif />
              ) : (
                <>
                  {sedangClustering && ringkasanClustering && (
                    <div className="kpi-grid">
                      <article className="kpi-card">
                        <span>Total Wilayah</span>
                        <strong>{ringkasanClustering.totalWilayah}</strong>
                      </article>
                      <article className="kpi-card">
                        <span>Cluster 0</span>
                        <strong>{ringkasanClustering.cluster0}</strong>
                      </article>
                      <article className="kpi-card">
                        <span>Cluster 1</span>
                        <strong>{ringkasanClustering.cluster1}</strong>
                      </article>
                      <article className="kpi-card accent">
                        <span>Cluster Dominan</span>
                        <strong>{ringkasanClustering.clusterDominan}</strong>
                        <small>{ringkasanClustering.clusterDominanCount} wilayah</small>
                      </article>
                    </div>
                  )}

                  {sedangClustering && keteranganClusteringAktif.length > 0 && (
                    <div className="module-list" style={{ marginBottom: 12 }}>
                      {keteranganClusteringAktif.map((item) => (
                        <article className="module-item" key={item.cluster}>
                          <header>
                            <h4>{item.cluster}</h4>
                            <span className="status-chip active">
                              {new Intl.NumberFormat('id-ID').format(item.jumlah_wilayah)} wilayah
                            </span>
                          </header>
                          <p>{item.ringkasan}</p>
                        </article>
                      ))}
                    </div>
                  )}

                  {sedangPrioritasBantuan && (
                    <div className="kpi-grid">
                      <article className="kpi-card">
                        <span>Total Wilayah</span>
                        <strong>{ringkasanUtama.totalWilayah}</strong>
                      </article>
                      <article className="kpi-card">
                        <span>Prioritas Tinggi</span>
                        <strong>{ringkasanUtama.baik}</strong>
                      </article>
                      <article className="kpi-card">
                        <span>Prediksi Cocok</span>
                        <strong>{ringkasanUtama.benar}</strong>
                      </article>
                      <article className="kpi-card accent">
                        <span>Akurasi Kategori</span>
                        <strong>{ringkasanUtama.akurasi}%</strong>
                        <small>Data terbaru {ringkasanUtama.tahunTerbaru || '-'}</small>
                      </article>
                    </div>
                  )}

                  {sedangHasilKeseluruhan && (
                    <div className="kpi-grid">
                      <article className="kpi-card">
                        <span>Total Wilayah</span>
                        <strong>{ringkasanUtama.totalWilayah}</strong>
                      </article>
                      <article className="kpi-card">
                        <span>Wilayah Baik</span>
                        <strong>{ringkasanUtama.baik}</strong>
                      </article>
                      <article className="kpi-card">
                        <span>Perlu Peningkatan</span>
                        <strong>{ringkasanUtama.perluPeningkatan}</strong>
                      </article>
                      <article className="kpi-card accent">
                        <span>Akurasi Prediksi</span>
                        <strong>{ringkasanUtama.akurasi}%</strong>
                        <small>Data terbaru {ringkasanUtama.tahunTerbaru || '-'}</small>
                      </article>
                    </div>
                  )}

                  {sedangJenjangTerlemah && ringkasanJenjangTerlemah && (
                    <div className="kpi-grid">
                      <article className="kpi-card">
                        <span>Total Wilayah</span>
                        <strong>{ringkasanJenjangTerlemah.totalWilayah}</strong>
                      </article>
                      <article className="kpi-card">
                        <span>Jenjang Terbanyak Kekurangan Guru</span>
                        <strong>{ringkasanJenjangTerlemah.jenjangDominan}</strong>
                      </article>
                      <article className="kpi-card accent">
                        <span>Wilayah di Jenjang Tersebut</span>
                        <strong>{ringkasanJenjangTerlemah.jenjangDominanCount}</strong>
                        <small>dari {ringkasanJenjangTerlemah.totalWilayah} wilayah</small>
                      </article>
                    </div>
                  )}

                  {sedangPerJenjang && ringkasanPerJenjang && (
                    <div className="kpi-grid">
                      <article className="kpi-card">
                        <span>Total Wilayah</span>
                        <strong>{ringkasanPerJenjang.totalWilayah}</strong>
                      </article>
                      <article className="kpi-card">
                        <span>Perlu Peningkatan ({ringkasanPerJenjang.jenjangLabel})</span>
                        <strong>{ringkasanPerJenjang.perluPeningkatan}</strong>
                      </article>
                      <article className="kpi-card">
                        <span>Prediksi Cocok</span>
                        <strong>{ringkasanPerJenjang.cocok}</strong>
                      </article>
                      <article className="kpi-card accent">
                        <span>Akurasi Prediksi</span>
                        <strong>{ringkasanPerJenjang.akurasi}%</strong>
                      </article>
                    </div>
                  )}

                  {sedangKlasifikasiTren && ringkasanTren && (
                    <div className="kpi-grid">
                      <article className="kpi-card">
                        <span>Total Wilayah</span>
                        <strong>{ringkasanTren.total}</strong>
                      </article>
                      <article className="kpi-card" style={{ borderTop: '3px solid #22c55e' }}>
                        <span>📈 Pendidikan Membaik</span>
                        <strong style={{ color: '#16a34a' }}>{ringkasanTren.membaik}</strong>
                      </article>
                      <article className="kpi-card" style={{ borderTop: '3px solid #f59e0b' }}>
                        <span>➡️ Stagnan</span>
                        <strong style={{ color: '#d97706' }}>{ringkasanTren.stagnan}</strong>
                      </article>
                      <article className="kpi-card accent" style={{ borderTop: '3px solid #ef4444' }}>
                        <span>📉 Pendidikan Menurun</span>
                        <strong style={{ color: '#dc2626' }}>{ringkasanTren.menurun}</strong>
                      </article>
                    </div>
                  )}

                  <div className="results-head">
                    <p className="results-count">
                      <span className="ping-dot" aria-hidden="true" />
                      {sedangPrioritasBantuan
                        ? 'Ringkasan prioritas wilayah terbaru'
                        : sedangHasilKeseluruhan
                          ? 'Ringkasan wilayah terbaru'
                          : sedangClustering
                            ? `${new Intl.NumberFormat('id-ID').format(ringkasanClustering?.totalWilayah ?? 0)} Wilayah Terpetakan`
                            : `${jumlahDataset} Entri Analisis`}
                    </p>

                    <div className="results-controls">
                      <label className="search-box" htmlFor="cari-dataset">
                        <input
                          id="cari-dataset"
                          type="search"
                          placeholder={sedangClustering ? `Cari wilayah atau cluster ${bidangAktif.toLowerCase()}...` : `Cari entri ${bidangAktif.toLowerCase()}...`}
                          value={kataKunci}
                          onChange={(e) => setKataKunci(e.target.value)}
                        />
                      </label>

                      {sedangClustering && (
                        <select
                          id="pilih-tema-clustering"
                          value={csvAktif}
                          onChange={(e) => setCsvAktif(e.target.value)}
                        >
                          {menuAktif.map((menu) => (
                            <option key={menu.path} value={menu.path}>
                              {menu.label}
                            </option>
                          ))}
                        </select>
                      )}

                      <select
                        value={modeUrut}
                        onChange={(e) => setModeUrut(e.target.value)}
                        disabled={halamanAktif === 'proyeksi'}
                      >
                        <option value="prioritas">Prioritas</option>
                        <option value="alfabet">Urut A-Z</option>
                      </select>

                      {halamanAktif === 'proyeksi' && isProyeksiWide && daftarVariabelProyeksi.length > 0 && (
                        <select
                          value={variabelProyeksiAktif}
                          onChange={(e) => setVariabelProyeksiAktif(e.target.value)}
                        >
                          {daftarVariabelProyeksi.map((variabel) => (
                            <option value={variabel} key={variabel}>{variabel}</option>
                          ))}
                        </select>
                      )}

                      {halamanAktif === 'evaluasi' && sedangPerJenjang && opsiJenjang.length > 0 && (
                        <select
                          value={jenjangAktif}
                          onChange={(e) => setJenjangAktif(e.target.value)}
                        >
                          {opsiJenjang.map((opsi) => (
                            <option value={opsi.value} key={opsi.value}>{opsi.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {!sedangClustering && (
                    <div className="dataset-menu">
                      {menuAktif.map((menu) => (
                        <button
                          key={menu.path}
                          onClick={() => setCsvAktif(menu.path)}
                          className={csvAktif === menu.path ? 'dataset-pill active' : 'dataset-pill'}
                        >
                          {menu.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <article className={sedangPrioritasBantuan || sedangHasilKeseluruhan || sedangKlasifikasiTren || sedangJenjangTerlemah || sedangClustering ? 'chart-card is-summary' : 'chart-card'}>
                    <header className="chart-header">
                      <h3>
                        {sedangClustering
                          ? `Distribusi Cluster ${menuAktif.find((menu) => menu.path === csvAktif)?.label ?? ''}`
                          : halamanAktif === 'evaluasi' && sedangPrioritasBantuan
                            ? `Wilayah Prioritas Perhatian Pendidikan – ${bidangAktif}`
                            : halamanAktif === 'evaluasi' && sedangHasilKeseluruhan
                              ? `Kondisi Pendidikan Tiap Wilayah – ${bidangAktif}`
                              : halamanAktif === 'proyeksi'
                                ? `Proyeksi Tren ${bidangAktif}`
                                : halamanAktif === 'evaluasi' && sedangPerJenjang
                                  ? `Kondisi Guru per Jenjang Sekolah – ${bidangAktif}`
                                  : halamanAktif === 'evaluasi' && sedangJenjangTerlemah
                                    ? `Jenjang Paling Kekurangan Guru – ${bidangAktif}`
                                    : halamanAktif === 'evaluasi' && sedangKlasifikasiTren
                                      ? `Tren Kemajuan Pendidikan Tiap Wilayah – ${bidangAktif}`
                                      : halamanAktif === 'evaluasi'
                                        ? `Evaluasi dan Ranking ${bidangAktif}`
                                        : ''}
                      </h3>
                      <span className="chart-tag">
                        {sedangClustering
                          ? (menuAktif.find((menu) => menu.path === csvAktif)?.label ?? 'Clustering')
                          : halamanAktif === 'proyeksi'
                            ? 'Skenario C'
                            : sedangPrioritasBantuan
                              ? 'Label Prioritas'
                              : sedangHasilKeseluruhan
                                ? `Terbaru ${ringkasanUtama.tahunTerbaru || '-'}`
                                : sedangPerJenjang
                                  ? (opsiJenjang.find((item) => item.value === jenjangAktif)?.label ?? 'Jenjang')
                                  : sedangKlasifikasiTren
                                    ? 'Ringkasan'
                                    : sedangJenjangTerlemah
                                      ? 'Distribusi'
                                      : 'Terbatas'}
                      </span>
                    </header>

                    <div className={halamanAktif === 'evaluasi' ? 'chart-wrap tall' : 'chart-wrap'}>{renderGrafik()}</div>

                    {/* SUMBER & DESKRIPSI SIMPULAN GRAFIK HISTORIS */}
                    {halamanAktif === 'proyeksi' && simpulanGrafikHistoris && (
                      <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', fontWeight: 700 }}>
                            📌 Deskripsi & Simpulan Tren
                          </h4>
                          {simpulanGrafikHistoris.r2 !== null && (
                            <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                              Akurasi Model (R²): {simpulanGrafikHistoris.r2.toFixed(3)}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: '#334155', lineHeight: '1.5' }}
                          dangerouslySetInnerHTML={{ __html: simpulanGrafikHistoris.teks.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', borderTop: '1px stroke #cbd5e1', paddingTop: '6px' }}>
                          Sumber Data Historis: <strong>{simpulanGrafikHistoris.sumber}</strong>
                        </div>
                      </div>
                    )}
                  </article>

                  {/* DAFTAR WILAYAH PER KATEGORI - KLASIFIKASI */}
                  {!sedangClustering && halamanAktif === 'evaluasi' && rawKlasifikasiData.length > 0 && (() => {
                    const kata = kataKunci.trim().toLowerCase();

                    // Tentukan konfigurasi label & warna per tab
                    let config = null;
                    let insightNode = null;

                    if (sedangHasilKeseluruhan) {
                      insightNode = (
                        <div style={{ marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#1e293b' }}>💡 Memahami Kondisi Pendidikan Tiap Wilayah</h4>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: '1.5' }}>
                            Pemetaan ini mengukur status pendidikan berdasarkan indikator utama seperti Rata-rata Lama Sekolah (RLS). Wilayah <strong>Baik</strong> memiliki capaian pendidikan yang memadai, sementara wilayah <strong>Perlu Peningkatan</strong> membutuhkan intervensi khusus untuk mengatasi isu seperti angka partisipasi sekolah yang rendah.
                          </p>
                        </div>
                      );
                      // Ambil data terbaru per wilayah
                      const mapTerbaru = new Map();
                      rawKlasifikasiData.forEach((row) => {
                        const wilayah = String(row.kabupaten_kota ?? '').trim();
                        const tahun = Number(row.tahun ?? 0);
                        if (!wilayah) return;
                        const lama = mapTerbaru.get(wilayah);
                        if (!lama || tahun >= Number(lama.tahun ?? 0)) mapTerbaru.set(wilayah, row);
                      });
                      const terbaru = Array.from(mapTerbaru.values());
                      const kategoriList = ['Baik', 'Perlu Peningkatan'];
                      const warna = { 'Baik': '#22c55e', 'Perlu Peningkatan': '#ef4444' };
                      config = { judul: 'Daftar Wilayah per Kondisi Pendidikan', kategoriList, warna, getLabel: (row) => String(row.Label_RLS ?? '').trim() };
                      config.rows = terbaru;
                    } else if (sedangPrioritasBantuan) {
                      insightNode = (
                        <div style={{ marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#1e293b' }}>💡 Memahami Prioritas Bantuan</h4>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: '1.5' }}>
                            Kategori ini diurutkan berdasarkan urgensi kebutuhan. Wilayah <strong>Prioritas Tinggi</strong> adalah daerah yang indikator pendidikannya berada jauh di bawah standar sehingga butuh alokasi bantuan segera. Wilayah <strong>Prioritas Rendah</strong> berarti kondisi pendidikan sudah relatif stabil.
                          </p>
                        </div>
                      );
                      const mapTerbaru = new Map();
                      rawKlasifikasiData.forEach((row) => {
                        const wilayah = String(row.kabupaten_kota ?? '').trim();
                        const tahun = Number(row.tahun ?? 0);
                        if (!wilayah) return;
                        const lama = mapTerbaru.get(wilayah);
                        if (!lama || tahun >= Number(lama.tahun ?? 0)) mapTerbaru.set(wilayah, row);
                      });
                      const terbaru = Array.from(mapTerbaru.values());
                      const kategoriList = ['Prioritas Tinggi', 'Prioritas Sedang', 'Prioritas Rendah'];
                      const warna = { 'Prioritas Tinggi': '#ef4444', 'Prioritas Sedang': '#f59e0b', 'Prioritas Rendah': '#22c55e' };
                      config = { judul: 'Daftar Wilayah per Prioritas', kategoriList, warna, getLabel: (row) => String(row.Label_Prioritas ?? '').trim() };
                      config.rows = terbaru;
                    } else if (sedangJenjangTerlemah) {
                      insightNode = (
                        <div style={{ marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#1e293b' }}>💡 Memahami Jenjang Paling Kekurangan Guru</h4>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: '1.5' }}>
                            Analisis ini mengidentifikasi jenjang pendidikan mana (SD, SMP, SMA, atau SMK) yang paling mengalami kekurangan guru di tiap wilayah. Data ini sangat krusial untuk mengarahkan fokus rekrutmen atau pemerataan tenaga pengajar secara spesifik.
                          </p>
                        </div>
                      );
                      const mapTerbaru = new Map();
                      rawKlasifikasiData.forEach((row) => {
                        const wilayah = String(row.kabupaten_kota ?? '').trim();
                        const tahun = Number(row.tahun ?? 0);
                        if (!wilayah) return;
                        const lama = mapTerbaru.get(wilayah);
                        if (!lama || tahun >= Number(lama.tahun ?? 0)) mapTerbaru.set(wilayah, row);
                      });
                      const terbaru = Array.from(mapTerbaru.values());
                      const kategoriList = ['SD', 'SMP', 'SMA', 'SMK'];
                      const warna = { 'SD': '#6366f1', 'SMP': '#f59e0b', 'SMA': '#ef4444', 'SMK': '#8b5cf6' };
                      config = { judul: 'Daftar Wilayah per Jenjang Kekurangan Guru', kategoriList, warna, getLabel: (row) => String(row.Jenjang_Terlemah ?? '').trim().toUpperCase() };
                      config.rows = terbaru;
                    } else if (sedangPerJenjang) {
                      const mapTerbaru = new Map();
                      rawKlasifikasiData.forEach((row) => {
                        const wilayah = String(row.kabupaten_kota ?? '').trim();
                        const tahun = Number(row.tahun ?? 0);
                        if (!wilayah) return;
                        const lama = mapTerbaru.get(wilayah);
                        if (!lama || tahun >= Number(lama.tahun ?? 0)) mapTerbaru.set(wilayah, row);
                      });
                      const terbaru = Array.from(mapTerbaru.values());
                      const jLabel = jenjangAktif.replace('rasio_murid_per_guru_', '').toUpperCase();

                      const sorted = [...terbaru].sort((a, b) => Number(a[jenjangAktif] ?? 0) - Number(b[jenjangAktif] ?? 0));
                      const terbaik = sorted[0];
                      const terburuk = sorted[sorted.length - 1];
                      const rataRata = sorted.reduce((sum, row) => sum + Number(row[jenjangAktif] ?? 0), 0) / (sorted.length || 1);

                      const teksPenjelasan = `Grafik di atas menampilkan <strong>Rasio Murid per Guru</strong> untuk jenjang ${jLabel}. <strong>${terbaik?.kabupaten_kota || 'Wilayah terbaik'}</strong> merupakan wilayah dengan kondisi terbaik karena memiliki rasio terendah (${Number(terbaik?.[jenjangAktif] ?? 0).toFixed(1)}), yang berarti beban satu guru sangat ringan dan pembelajaran lebih terfokus. Sebaliknya, <strong>${terburuk?.kabupaten_kota || 'Wilayah terburuk'}</strong> perlu mendapat prioritas penambahan guru karena memiliki rasio tertinggi (${Number(terburuk?.[jenjangAktif] ?? 0).toFixed(1)}), menandakan satu guru harus menangani terlalu banyak murid.`;

                      return (
                        <div className="clustering-regions-section" style={{ marginTop: 24 }}>
                          <h3 style={{ marginBottom: 14, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
                            💡 Memahami Kondisi {jLabel}
                          </h3>
                          <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                            <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#334155', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: teksPenjelasan }} />
                            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                              <article className="kpi-card" style={{ borderTop: '3px solid #22c55e', padding: '16px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Kondisi Terbaik (Rasio Terendah)</span>
                                <strong style={{ color: '#16a34a', fontSize: '1.25rem', display: 'block', margin: '4px 0' }}>{terbaik?.kabupaten_kota}</strong>
                                <small style={{ color: '#475569', fontSize: '0.9rem' }}>{Number(terbaik?.[jenjangAktif]).toFixed(1)} murid / guru</small>
                              </article>
                              <article className="kpi-card" style={{ borderTop: '3px solid #3b82f6', padding: '16px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Rata-rata Provinsi</span>
                                <strong style={{ color: '#2563eb', fontSize: '1.25rem', display: 'block', margin: '4px 0' }}>{rataRata.toFixed(1)}</strong>
                                <small style={{ color: '#475569', fontSize: '0.9rem' }}>murid / guru</small>
                              </article>
                              <article className="kpi-card" style={{ borderTop: '3px solid #ef4444', padding: '16px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Perlu Perhatian (Rasio Tertinggi)</span>
                                <strong style={{ color: '#dc2626', fontSize: '1.25rem', display: 'block', margin: '4px 0' }}>{terburuk?.kabupaten_kota}</strong>
                                <small style={{ color: '#475569', fontSize: '0.9rem' }}>{Number(terburuk?.[jenjangAktif]).toFixed(1)} murid / guru</small>
                              </article>
                            </div>
                          </div>
                        </div>
                      );
                    } else if (sedangKlasifikasiTren) {
                      insightNode = (
                        <div style={{ marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#1e293b' }}>💡 Memahami Tren Kemajuan Pendidikan</h4>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: '1.5' }}>
                            Tren ini melihat pergerakan indikator pendidikan dari tahun ke tahun. Wilayah dengan tren <strong>Membaik</strong> menunjukkan peningkatan berkelanjutan. <strong>Stagnan</strong> berarti tidak ada perubahan berarti, sementara <strong>Menurun</strong> mengindikasikan adanya penurunan kualitas yang harus segera ditindaklanjuti.
                          </p>
                        </div>
                      );
                      const kategoriList = ['Membaik', 'Stagnan', 'Menurun'];
                      const warna = { 'Membaik': '#22c55e', 'Stagnan': '#f59e0b', 'Menurun': '#ef4444' };
                      config = { judul: 'Daftar Wilayah per Tren Kemajuan Pendidikan', kategoriList, warna, getLabel: (row) => String(row.label_tren ?? '').trim() };
                      config.rows = rawKlasifikasiData;
                    }

                    if (!config) return null;

                    return (
                      <div className="clustering-regions-section" style={{ marginTop: 24 }}>
                        <h3 style={{ marginBottom: 14, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
                          {config.judul}
                        </h3>
                        {insightNode}
                        <div className="clustering-regions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                          {config.kategoriList.map((kategori) => {
                            const wilayahDiKategori = config.rows
                              .filter((row) => config.getLabel(row) === kategori)
                              .map((row) => String(row.kabupaten_kota ?? '').trim())
                              .filter(Boolean)
                              .filter((w) => !kata || w.toLowerCase().includes(kata))
                              .sort((a, b) => a.localeCompare(b, 'id'));

                            const borderColor = config.warna[kategori] ?? '#cbd5e1';

                            return (
                              <article className="chart-card" key={kategori} style={{ padding: 16, borderTop: `3px solid ${borderColor}` }}>
                                <header className="chart-header" style={{ borderBottom: '1px solid #e7ebf1', paddingBottom: 8, marginBottom: 12 }}>
                                  <h4 style={{ margin: 0, color: '#1f2a3f', fontSize: '1rem', fontWeight: 700 }}>
                                    {kategori}
                                  </h4>
                                  <span className="status-chip active">
                                    {wilayahDiKategori.length} Wilayah
                                  </span>
                                </header>
                                <div style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: 4 }}>
                                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.88rem', color: '#47526a', lineHeight: '1.7' }}>
                                    {wilayahDiKategori.map((wilayah) => (
                                      <li key={wilayah} style={{ marginBottom: 4 }}>{wilayah}</li>
                                    ))}
                                    {wilayahDiKategori.length === 0 && (
                                      <li style={{ listStyleType: 'none', marginLeft: -18, color: '#939bae', fontStyle: 'italic' }}>
                                        Tidak ada wilayah yang cocok
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {sedangClustering && rawClusteringData.length > 0 && (
                    <div className="clustering-regions-section" style={{ marginTop: 24 }}>
                      <h3 style={{ marginBottom: 14, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
                        Daftar Wilayah per Cluster
                      </h3>
                      <div className="clustering-regions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        {[...new Set(rawClusteringData.map(r => r.cluster))].filter(c => c !== null && c !== undefined && String(c).trim() !== '').sort((a, b) => Number(a) - Number(b)).map(clusterId => {
                          const kata = kataKunci.trim().toLowerCase();
                          const wilayahDiCluster = rawClusteringData
                            .filter(r => String(r.cluster) === String(clusterId))
                            .map(r => r.kabupaten_kota)
                            .filter(Boolean)
                            .filter(wilayah => !kata || wilayah.toLowerCase().includes(kata))
                            .sort((a, b) => a.localeCompare(b, 'id'));

                          return (
                            <article className="chart-card" key={clusterId} style={{ padding: 16 }}>
                              <header className="chart-header" style={{ borderBottom: '1px solid #e7ebf1', paddingBottom: 8, marginBottom: 12 }}>
                                <h4 style={{ margin: 0, color: '#1f2a3f', fontSize: '1rem', fontWeight: 700 }}>
                                  Cluster {clusterId}
                                </h4>
                                <span className="status-chip active">
                                  {wilayahDiCluster.length} Wilayah
                                </span>
                              </header>
                              <div style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: 4 }}>
                                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.88rem', color: '#47526a', lineHeight: '1.7' }}>
                                  {wilayahDiCluster.map(wilayah => (
                                    <li key={wilayah} style={{ marginBottom: 4 }}>{wilayah}</li>
                                  ))}
                                  {wilayahDiCluster.length === 0 && (
                                    <li style={{ listStyleType: 'none', marginLeft: -18, color: '#939bae', fontStyle: 'italic' }}>
                                      Tidak ada wilayah yang cocok
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}