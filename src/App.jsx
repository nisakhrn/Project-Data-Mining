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

  const menuKlasifikasi = [
    { label: "Hasil Keseluruhan", path: "/data/klasifikasi/hasil_klasifikasi.csv" },
    { label: "Distribusi Prioritas Bantuan", path: "/data/klasifikasi/hasil_klasifikasi_prioritas.csv" },
    { label: "Jenjang Terlemah", path: "/data/klasifikasi/hasil_klasifikasi_jenjang_terlemah.csv" },
    { label: "Evaluasi Per Jenjang", path: "/data/klasifikasi/hasil_klasifikasi_per_jenjang.csv" },
    { label: "Klasifikasi Tren", path: "/data/klasifikasi/hasil_klasifikasi_tren.csv" }
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
        ringkasan: 'Wilayah dengan proporsi Sekolah Dasar (SD) yang sangat tinggi (mendominasi total sekolah), umum terjadi di daerah kabupaten.'
      },
      {
        cluster: 'Cluster 1',
        ringkasan: 'Wilayah perkotaan dengan proporsi Sekolah Dasar yang lebih rendah karena sebaran sekolah menengah (SMP/SMA/SMK) lebih merata.'
      }
    ]
  };

  const modulAnalitik = [
    { nama: 'Klasifikasi', status: 'Aktif', keterangan: 'Pemetaan prioritas bantuan berdasarkan indikator pendidikan.' },
    { nama: 'Clustering', status: 'Aktif', keterangan: 'Pengelompokan wilayah berdasarkan pola indikator pada 5 tema CSV.' },
    { nama: 'Regresi', status: 'Aktif', keterangan: 'Proyeksi tren indikator lintas bidang ke depan.' }
  ];

  useEffect(() => {
    // Klasifikasi: ambil ringkasan wilayah "Baik" vs "Perlu Peningkatan" dari hasil terbaru
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

    // Clustering: ambil ringkasan jumlah wilayah per cluster dari tema utama
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

    // Regresi: ambil ringkasan arah tren dari model yang sudah dilatih
    fetch('/data/regresi/model_regresi_skenario_c.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          setRingkasanGabungan((prev) => ({ ...prev, regresi: null }));
          return;
        }
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

      // Cocokkan label CSV (mis. "Jumlah Murid SD (Provinsi Aceh)") ke kunci JSON historis
      // (mis. "Jumlah_Murid_SD"), lalu gabungkan jadi satu rangkaian: garis historis asli + garis proyeksi.
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

  const gantiHalaman = (halaman) => {
    setHalamanAktif(halaman);
    setKataKunci('');
    setSedangRingkasanUtama(false);

    if (halaman === 'evaluasi') {
      setCsvAktif('/data/klasifikasi/hasil_klasifikasi.csv');
      return;
    }

    setCsvAktif('/data/regresi/hasil_proyeksi_skenario_c.csv');
  };

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
              tickFormatter={(v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(v)}
            />
            <Tooltip
              formatter={(v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(v)}
              contentStyle={{ borderRadius: '10px', borderColor: '#e8ebf0' }}
            />
            <Legend />
            {adaDataHistoris && (
              <Line
                type="monotone"
                dataKey="aktual"
                name="Data Historis Asli"
                stroke="#2a78d6"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="proyeksi"
              name="Garis Proyeksi (Model)"
              stroke="#eb2b39"
              strokeWidth={2}
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
          <h1>Dashboard Ringkasan Data Mining Daerah</h1>
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

            {!sedangClustering && (
              <>
                <h3 className="subsection-title">Mode Analisis</h3>
                <div className="mode-toggle" role="tablist" aria-label="Mode analisis">
                  <button
                    className={halamanAktif === 'evaluasi' ? 'mode-btn active' : 'mode-btn'}
                    onClick={() => gantiHalaman('evaluasi')}
                  >
                    Klasifikasi/Ranking
                  </button>
                  <button
                    className={halamanAktif === 'proyeksi' ? 'mode-btn active' : 'mode-btn'}
                    onClick={() => gantiHalaman('proyeksi')}
                  >
                    Regresi
                  </button>
                </div>
              </>
            )}

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
                        ? `Distribusi Prioritas Bantuan ${bidangAktif}`
                        : halamanAktif === 'evaluasi' && sedangHasilKeseluruhan
                          ? `Ringkasan Hasil Keseluruhan ${bidangAktif}`
                          : halamanAktif === 'proyeksi'
                            ? `Proyeksi Tren ${bidangAktif}`
                            : halamanAktif === 'evaluasi' && sedangPerJenjang
                              ? `Evaluasi Per Jenjang ${bidangAktif}`
                              : halamanAktif === 'evaluasi' && sedangJenjangTerlemah
                                ? `Peta Jenjang Terlemah ${bidangAktif}`
                                : halamanAktif === 'evaluasi' && sedangKlasifikasiTren
                                  ? `Distribusi Klasifikasi Tren ${bidangAktif}`
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
            </article>

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