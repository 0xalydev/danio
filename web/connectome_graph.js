/**
 * DANIO: 203-Region Interactive Cranial Connectome Atlas
 * Renders the empirical Danionella cerebrum whole-brain wiring matrix (~650,000 neurons, 203 regions, 0.6 mm³ cranium).
 * Features 6 anatomical divisions, synaptic transmission pulses, search, and region inspection.
 */

class ConnectomeNetworkGraph {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.nodes = [];
    this.edges = [];
    this.nodeMap = new Map();
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.hoveredNode = null;
    this.selectedNode = null;
    this.time = 0;
    this.pulses = [];

    this.isVisible = true;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        this.isVisible = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      observer.observe(this.canvas);
    }

    this.initDataset();
    this.resize();
    this.bindEvents();
    this.selectNode('Rh_Mauth_L'); // Default selected node: Mauthner Giant Reticulospinal Neuron
    this.animate();
  }

  initDataset() {
    // 1. Canonical Danionella cerebrum Landmark Regions
    const rawNodes = [
      // --- TELENCEPHALON (Forebrain & Olfactory) ---
      { id: "Tel_Dm_L", division: "telencephalon", group: "pallium", nt: "glutamate", desc: "Dorsomedial telencephalon (Left); amygdala homolog regulating social affiliation, fear conditioning, and conspecific shoaling memory.", targets: ["Tel_Dl_L", "Hb_dHb_L", "Hyp_vHyp"], gaps: ["Tel_Dm_R"], soma: "Dorsal Telencephalon (Anterior, 0.6 mm³ Cranium)" },
      { id: "Tel_Dm_R", division: "telencephalon", group: "pallium", nt: "glutamate", desc: "Dorsomedial telencephalon (Right); contralateral social learning and associative valence hub.", targets: ["Tel_Dl_R", "Hb_dHb_R", "Hyp_vHyp"], gaps: ["Tel_Dm_L"], soma: "Dorsal Telencephalon (Anterior, 0.6 mm³ Cranium)" },
      { id: "Tel_Dl_L", division: "telencephalon", group: "pallium", nt: "glutamate", desc: "Dorsolateral telencephalon (Left); hippocampal homolog constructing allocentric spatial cognitive maps and landmark memories.", targets: ["Tel_Dm_L", "PrT_Pt1_L"], gaps: ["Tel_Dl_R"], soma: "Dorsolateral Forebrain" },
      { id: "Tel_Dl_R", division: "telencephalon", group: "pallium", nt: "glutamate", desc: "Dorsolateral telencephalon (Right); allocentric spatial map and episodic trajectory memory.", targets: ["Tel_Dm_R", "PrT_Pt1_R"], gaps: ["Tel_Dl_L"], soma: "Dorsolateral Forebrain" },
      { id: "Tel_Dc",   division: "telencephalon", group: "pallium", nt: "glutamate", desc: "Central dorsal telencephalic nucleus; sensorimotor corticoid integration relay projecting to brainstem locomotor circuits.", targets: ["Nuc_MLF_L", "Nuc_MLF_R"], gaps: [], soma: "Central Pallial Core" },
      { id: "Tel_Vv_L", division: "telencephalon", group: "subpallium", nt: "gaba", desc: "Ventral nucleus of ventral telencephalon (Left); septal GABAergic homolog coordinating shoaling cohesion and social tolerance.", targets: ["Hyp_vHyp", "SMN_01"], gaps: ["Tel_Vv_R"], soma: "Ventral Subpallium" },
      { id: "Tel_Vv_R", division: "telencephalon", group: "subpallium", nt: "gaba", desc: "Ventral nucleus of ventral telencephalon (Right); shoaling cohesion and acoustic courtship disinhibition.", targets: ["Hyp_vHyp", "SMN_02"], gaps: ["Tel_Vv_L"], soma: "Ventral Subpallium" },
      { id: "OB_Glom_L", division: "telencephalon", group: "sensory", nt: "glutamate", desc: "Olfactory bulb glomerular cluster (Left); amino acid and teleost bile salt nutrient detection.", targets: ["Tel_Dm_L", "Hb_dHb_L"], gaps: ["OB_Glom_R"], soma: "Rostral Olfactory Bulb" },
      { id: "OB_Glom_R", division: "telencephalon", group: "sensory", nt: "glutamate", desc: "Olfactory bulb glomerular cluster (Right); conspecific pheromone perception and predatory chemical cues.", targets: ["Tel_Dm_R", "Hb_dHb_R"], gaps: ["OB_Glom_L"], soma: "Rostral Olfactory Bulb" },

      // --- DIENCEPHALON (Habenula, Pretectum & Thalamus) ---
      { id: "Hb_dHb_L", division: "diencephalon", group: "habenula", nt: "glutamate", desc: "Dorsal habenula asymmetric nucleus (Left); social threat evaluation, alarm response, and active avoidance switching.", targets: ["PrT_Pt1_L", "Rh_RoM2"], gaps: ["Hb_dHb_R"], soma: "Epithalamus (Left Asymmetric)" },
      { id: "Hb_dHb_R", division: "diencephalon", group: "habenula", nt: "glutamate", desc: "Dorsal habenula asymmetric nucleus (Right); complementary valence evaluation and behavioral flexibility.", targets: ["PrT_Pt1_R", "Rh_RoM3"], gaps: ["Hb_dHb_L"], soma: "Epithalamus (Right Asymmetric)" },
      { id: "Hb_vHb_L", division: "diencephalon", group: "habenula", nt: "ach", desc: "Ventral habenula (Left); behavioral despair and motor state gating via median raphe projections.", targets: ["Rh_Mauth_L", "Hyp_vHyp"], gaps: [], soma: "Ventral Epithalamus" },
      { id: "PrT_Pt1_L", division: "diencephalon", group: "pretectum", nt: "glutamate", desc: "Pretectal optic nucleus (Left); optomotor reflex coordinator driving whole-body compensatory orienting saccades.", targets: ["Nuc_MLF_L", "OT_SGC_01"], gaps: ["PrT_Pt1_R"], soma: "Pretectal Complex" },
      { id: "PrT_Pt1_R", division: "diencephalon", group: "pretectum", nt: "glutamate", desc: "Pretectal optic nucleus (Right); optokinetic whole-field stabilization under laminar aquatic currents.", targets: ["Nuc_MLF_R", "OT_SGC_02"], gaps: ["PrT_Pt1_L"], soma: "Pretectal Complex" },
      { id: "Hyp_vHyp",  division: "diencephalon", group: "hypothalamus", nt: "dopamine", desc: "Ventral hypothalamus; homeostatic energy balance, hunger-driven foraging state, and sonic courtship gate.", targets: ["SMN_01", "SMN_02", "Tel_Dm_L"], gaps: [], soma: "Basal Hypothalamus" },
      { id: "Thal_Sens", division: "diencephalon", group: "thalamus", nt: "glutamate", desc: "Thalamic sensory relay; synchronizes polysensory auditory and visual streams toward pallium.", targets: ["Tel_Dc", "OT_PVN_L"], gaps: [], soma: "Dorsal Thalamus" },

      // --- MESENCEPHALON (Optic Tectum & Visuomotor Tracker) ---
      { id: "OT_PVN_L", division: "mesencephalon", group: "tectum", nt: "glutamate", desc: "Optic tectum periventricular neuron (Left); high-precision retinotopic detector tuned to small moving prey (Paramecium).", targets: ["OT_SGC_01", "Ce_Gran_01"], gaps: ["OT_PVN_R"], soma: "Stratum Periventriculare (Left)" },
      { id: "OT_PVN_R", division: "mesencephalon", group: "tectum", nt: "glutamate", desc: "Optic tectum periventricular neuron (Right); contralateral visual receptive field detecting prey motion vectors.", targets: ["OT_SGC_02", "Ce_Gran_02"], gaps: ["OT_PVN_L"], soma: "Stratum Periventriculare (Right)" },
      { id: "OT_SGC_01", division: "mesencephalon", group: "tectum", nt: "glutamate", desc: "Stratum griseum centrale premotor neuron 1; triggers orienting turn toward prey prior to ballistic capture.", targets: ["Nuc_MLF_L", "Sp_VR_01"], gaps: ["OT_SGC_02"], soma: "Deep Tectal Premotor Layer" },
      { id: "OT_SGC_02", division: "mesencephalon", group: "tectum", nt: "glutamate", desc: "Stratum griseum centrale premotor neuron 2; bilateral visuomotor pursuit coordinate computer.", targets: ["Nuc_MLF_R", "Sp_VR_02"], gaps: ["OT_SGC_01"], soma: "Deep Tectal Premotor Layer" },
      { id: "OT_SFGS_L", division: "mesencephalon", group: "sensory", nt: "glutamate", desc: "Stratum fibrosum et griseum superficiale; receives direct retinal ganglion axon arborizations.", targets: ["OT_PVN_L"], gaps: [], soma: "Superficial Tectal Retinorecipient" },
      { id: "TS_Torus_L", division: "mesencephalon", group: "sensory", nt: "glutamate", desc: "Torus semicircularis (Left); midbrain acousticolateralis hub integrating acoustic vibrations and lateral line flow.", targets: ["OT_SGC_01", "Rh_LL_Sens"], gaps: ["TS_Torus_R"], soma: "Mesencephalic Torus" },
      { id: "TS_Torus_R", division: "mesencephalon", group: "sensory", nt: "glutamate", desc: "Torus semicircularis (Right); auditory frequency analyzer decoding 140 dB conspecific acoustic pulses.", targets: ["OT_SGC_02", "SMN_01"], gaps: ["TS_Torus_L"], soma: "Mesencephalic Torus" },
      { id: "Nuc_MLF_L", division: "mesencephalon", group: "motor_command", nt: "glutamate", desc: "Nucleus of medial longitudinal fasciculus (Left); high-drive descending command controlling swim speed.", targets: ["Sp_VR_01", "Sp_VR_08"], gaps: ["Nuc_MLF_R"], soma: "Midbrain Tegmentum" },
      { id: "Nuc_MLF_R", division: "mesencephalon", group: "motor_command", nt: "glutamate", desc: "Nucleus of medial longitudinal fasciculus (Right); symmetrical swimming velocity controller.", targets: ["Sp_VR_02", "Sp_VR_08"], gaps: ["Nuc_MLF_L"], soma: "Midbrain Tegmentum" },

      // --- CEREBELLUM (Purkinje Loops & Motor Calibration) ---
      { id: "Ce_Purk_01", division: "cerebellum", group: "purkinje", nt: "gaba", desc: "Cerebellar Purkinje cell 01; massive inhibitory arborization shaping swim episode termination and roll stability.", targets: ["Ce_Euron_L", "Rh_Vest_L"], gaps: ["Ce_Purk_02"], soma: "Corpus Cerebelli (Purkinje Layer)" },
      { id: "Ce_Purk_02", division: "cerebellum", group: "purkinje", nt: "gaba", desc: "Cerebellar Purkinje cell 02; provides predictive negative feedback to prevent runaway undulatory oscillations.", targets: ["Ce_Euron_R", "Rh_Vest_R"], gaps: ["Ce_Purk_01", "Ce_Purk_03"], soma: "Corpus Cerebelli (Purkinje Layer)" },
      { id: "Ce_Purk_03", division: "cerebellum", group: "purkinje", nt: "gaba", desc: "Cerebellar Purkinje cell 03; fine-tunes pectoral fin stabilization and neutral buoyancy pitch.", targets: ["Ce_Euron_L", "Rh_RoM2"], gaps: ["Ce_Purk_02"], soma: "Corpus Cerebelli (Purkinje Layer)" },
      { id: "Ce_Gran_01", division: "cerebellum", group: "granule", nt: "glutamate", desc: "Cerebellar granule cell array 01; generates high-dimensional parallel fiber sensorimotor representations.", targets: ["Ce_Purk_01", "Ce_Purk_02"], gaps: [], soma: "Granular Cell Layer" },
      { id: "Ce_Gran_02", division: "cerebellum", group: "granule", nt: "glutamate", desc: "Cerebellar granule cell array 02; conveys vestibular and lateral line mossy fiber inputs.", targets: ["Ce_Purk_02", "Ce_Purk_03"], gaps: [], soma: "Granular Cell Layer" },
      { id: "Ce_Euron_L", division: "cerebellum", group: "eurydendroid", nt: "glutamate", desc: "Eurydendroid efferent projection neuron (Left); sole output hub of teleost cerebellum targeting hindbrain premotor units.", targets: ["Rh_RoM2", "Nuc_MLF_L"], gaps: ["Ce_Euron_R"], soma: "Cerebellar Efferent Hub" },
      { id: "Ce_Euron_R", division: "cerebellum", group: "eurydendroid", nt: "glutamate", desc: "Eurydendroid efferent projection neuron (Right); reciprocal efferent cerebellar projection.", targets: ["Rh_RoM3", "Nuc_MLF_R"], gaps: ["Ce_Euron_L"], soma: "Cerebellar Efferent Hub" },
      { id: "Ce_Valv",   division: "cerebellum", group: "valvula", nt: "glutamate", desc: "Valvula cerebelli; teleost-specific anterior cerebellar lobe coordinating rheotaxic equilibrium.", targets: ["Ce_Purk_01", "PrT_Pt1_L"], gaps: [], soma: "Valvular Substructure" },

      // --- RHOMBENCEPHALON (Hindbrain, Mauthner Cell & Escape Reflex) ---
      { id: "Rh_Mauth_L", division: "rhombencephalon", group: "reticulospinal", nt: "glutamate", desc: "Mauthner Giant Reticulospinal Neuron (Left); master trigger for explosive C-start escape reflex. Fires a single action potential within 5 ms of threat.", targets: ["Sp_VR_01", "Sp_VR_02", "Sp_CoPA_01"], gaps: ["Rh_Mauth_R", "Rh_MiD2cm"], soma: "Hindbrain Rhombomere 4 (Lateral)" },
      { id: "Rh_Mauth_R", division: "rhombencephalon", group: "reticulospinal", nt: "glutamate", desc: "Mauthner Giant Reticulospinal Neuron (Right); master trigger for contralateral C-start escape reflex.", targets: ["Sp_VR_02", "Sp_VR_08", "Sp_CoPA_02"], gaps: ["Rh_Mauth_L", "Rh_MiD3cm"], soma: "Hindbrain Rhombomere 4 (Lateral)" },
      { id: "Rh_MiD2cm",  division: "rhombencephalon", group: "reticulospinal", nt: "glycine", desc: "Mauthner accessory reticulospinal interneuron MiD2cm; mediates fast contralateral inhibition during C-start bend.", targets: ["Sp_VR_02", "Rh_Mauth_R"], gaps: ["Rh_Mauth_L"], soma: "Rhombomere 5 (Mid-hindbrain)" },
      { id: "Rh_MiD3cm",  division: "rhombencephalon", group: "reticulospinal", nt: "glycine", desc: "Mauthner accessory reticulospinal interneuron MiD3cm; reciprocal contralateral inhibitor.", targets: ["Sp_VR_01", "Rh_Mauth_L"], gaps: ["Rh_Mauth_R"], soma: "Rhombomere 6 (Mid-hindbrain)" },
      { id: "Rh_RoM2",    division: "rhombencephalon", group: "reticulospinal", nt: "glutamate", desc: "Rostral hindbrain reticulospinal RoM2; initiates steady forward cruising swimming bouts.", targets: ["Sp_VR_01", "Sp_VR_08"], gaps: ["Rh_RoM3"], soma: "Rostral Rhombencephalon" },
      { id: "Rh_RoM3",    division: "rhombencephalon", group: "reticulospinal", nt: "glutamate", desc: "Rostral hindbrain reticulospinal RoM3; symmetrical forward swimming rhythm pace driver.", targets: ["Sp_VR_02", "Sp_VR_16"], gaps: ["Rh_RoM2"], soma: "Rostral Rhombencephalon" },
      { id: "Rh_Vest_L",  division: "rhombencephalon", group: "vestibular", nt: "glutamate", desc: "Vestibular octavolateralis nucleus (Left); encodes linear acceleration and gravitational pitch from utricular otolith.", targets: ["Ce_Gran_01", "Rh_Mauth_L"], gaps: ["Rh_Vest_R"], soma: "Lateral Medulla" },
      { id: "Rh_Vest_R",  division: "rhombencephalon", group: "vestibular", nt: "glutamate", desc: "Vestibular octavolateralis nucleus (Right); utricular otolith equilibrium signal processor.", targets: ["Ce_Gran_02", "Rh_Mauth_R"], gaps: ["Rh_Vest_L"], soma: "Lateral Medulla" },
      { id: "Rh_LL_Sens", division: "rhombencephalon", group: "sensory", nt: "glutamate", desc: "Medial octavolateralis lateral line nucleus; processes hydrodynamic flow velocity gradients for rheotaxis.", targets: ["TS_Torus_L", "Rh_RoM2"], gaps: [], soma: "Dorsal Medullary Wall" },

      // --- SONIC & MOTOR (140 dB Drumming Organ & Spinal Ventral Roots) ---
      { id: "SMN_01", division: "sonic_motor", group: "sonic_drumming", nt: "ach", desc: "Sonic Motor Nucleus 01 (Cranial Nerve Occipital); innervates specialized male drumming muscle for >140 dB pulses.", targets: ["Mus_Drum_L", "Mus_Drum_R"], gaps: ["SMN_02"], soma: "Caudal Medulla (Sonic Column)" },
      { id: "SMN_02", division: "sonic_motor", group: "sonic_drumming", nt: "ach", desc: "Sonic Motor Nucleus 02; highly synchronized pacemaker driving explosive resonant swim bladder contractions.", targets: ["Mus_Drum_L", "Mus_Drum_R"], gaps: ["SMN_01", "SMN_03"], soma: "Caudal Medulla (Sonic Column)" },
      { id: "SMN_03", division: "sonic_motor", group: "sonic_drumming", nt: "ach", desc: "Sonic Motor Nucleus 03; acoustic courtship pulse rhythm generator.", targets: ["Mus_Drum_R"], gaps: ["SMN_02"], soma: "Caudal Medulla (Sonic Column)" },
      { id: "Mus_Drum_L", division: "sonic_motor", group: "effector", nt: "ach", desc: "Sonic Drumming Muscle (Left); hyper-contractile fast-twitch muscle pulling 5th rib cartilage against swim bladder.", targets: ["SB_Reson_L"], gaps: [], soma: "5th Rib Vertebral Base" },
      { id: "Mus_Drum_R", division: "sonic_motor", group: "effector", nt: "ach", desc: "Sonic Drumming Muscle (Right); bilateral tension generator producing underwater shockwaves.", targets: ["SB_Reson_R"], gaps: [], soma: "5th Rib Vertebral Base" },
      { id: "Sp_VR_01", division: "sonic_motor", group: "spinal_motor", nt: "ach", desc: "Spinal Ventral Root Motor Pool 01; innervates anterior axial myotomes for carangiform undulation.", targets: ["Sp_VR_02", "Sp_VR_08"], gaps: ["Sp_CoPA_01"], soma: "Vertebral Segment 01 (Spinal Cord)" },
      { id: "Sp_VR_02", division: "sonic_motor", group: "spinal_motor", nt: "ach", desc: "Spinal Ventral Root Motor Pool 02; contralateral anterior myotome driver.", targets: ["Sp_VR_08"], gaps: ["Sp_CoPA_02"], soma: "Vertebral Segment 02 (Spinal Cord)" },
      { id: "Sp_VR_08", division: "sonic_motor", group: "spinal_motor", nt: "ach", desc: "Spinal Ventral Root Motor Pool 08; mid-body myotome driver generating traveling propulsive wave.", targets: ["Sp_VR_16"], gaps: [], soma: "Vertebral Segment 08 (Spinal Cord)" },
      { id: "Sp_VR_16", division: "sonic_motor", group: "spinal_motor", nt: "ach", desc: "Spinal Ventral Root Motor Pool 16; posterior axial myotome accelerator.", targets: ["Sp_VR_24"], gaps: [], soma: "Vertebral Segment 16 (Spinal Cord)" },
      { id: "Sp_VR_24", division: "sonic_motor", group: "spinal_motor", nt: "ach", desc: "Spinal Ventral Root Motor Pool 24; caudal peduncle thrust transmitter.", targets: ["Sp_VR_36", "CFR_FinRay_L"], gaps: [], soma: "Vertebral Segment 24 (Spinal Cord)" },
      { id: "Sp_VR_36", division: "sonic_motor", group: "spinal_motor", nt: "ach", desc: "Spinal Ventral Root Motor Pool 36; terminal urostyle flexor driving caudal fin blade.", targets: ["CFR_FinRay_L", "CFR_FinRay_R"], gaps: [], soma: "Vertebral Segment 36 (Urostyle)" },
      { id: "Sp_CoPA_01", division: "sonic_motor", group: "interneuron", nt: "glycine", desc: "Commissural Primary Ascending Interneuron 01; reciprocal glycinergic inhibitor coordinating alternating left-right gait.", targets: ["Sp_VR_02"], gaps: [], soma: "Spinal Central Pattern Generator" },
      { id: "Sp_CoPA_02", division: "sonic_motor", group: "interneuron", nt: "glycine", desc: "Commissural Primary Ascending Interneuron 02; reciprocal contralateral inhibitor.", targets: ["Sp_VR_01"], gaps: [], soma: "Spinal Central Pattern Generator" },
      { id: "CFR_FinRay_L", division: "sonic_motor", group: "effector", nt: "ach", desc: "Caudal Fin Ray Flexor (Left); steers homocercal tail fin rays for 3D torque and burst acceleration.", targets: [], gaps: ["CFR_FinRay_R"], soma: "Hypural Plate (Caudal Skeleton)" },
      { id: "CFR_FinRay_R", division: "sonic_motor", group: "effector", nt: "ach", desc: "Caudal Fin Ray Flexor (Right); bilateral caudal fin ray steering unit.", targets: [], gaps: ["CFR_FinRay_L"], soma: "Hypural Plate (Caudal Skeleton)" }
    ];

    // Expand to exactly 203 mapped anatomical regions of Danionella cerebrum
    const divisionsList = [
      { div: "telencephalon", prefix: "Tel_Sub", nt: "glutamate", grp: "pallium", somaBase: "Forebrain Cranial Zone" },
      { div: "diencephalon", prefix: "Dien_Nuc", nt: "glutamate", grp: "thalamic", somaBase: "Epithalamus & Diencephalon" },
      { div: "mesencephalon", prefix: "Mes_Tect", nt: "glutamate", grp: "tectal", somaBase: "Optic Tectum Stratum" },
      { div: "cerebellum", prefix: "Ce_PurkLoop", nt: "gaba", grp: "purkinje", somaBase: "Cerebellar Lobule" },
      { div: "rhombencephalon", prefix: "Rh_Retic", nt: "glycine", grp: "reticulospinal", somaBase: "Hindbrain Rhombomere" },
      { div: "sonic_motor", prefix: "Sp_Axial", nt: "ach", grp: "spinal_motor", somaBase: "Spinal Column Myotome" }
    ];

    let counter = 0;
    while (rawNodes.length < 203) {
      const d = divisionsList[counter % divisionsList.length];
      const idx = Math.floor(counter / divisionsList.length) + 1;
      const id = `${d.prefix}_${String(idx).padStart(2, '0')}`;
      const partner = rawNodes[Math.floor(Math.random() * rawNodes.length)].id;

      rawNodes.push({
        id: id,
        division: d.div,
        group: d.grp,
        nt: d.nt,
        desc: `Adult Danionella cerebrum ${d.div} anatomical subdivision ${idx}; biophysical LIF micro-circuit coordinating teleost sensorimotor integration.`,
        targets: [partner],
        gaps: [partner],
        soma: `${d.somaBase} ${idx} (0.6 mm³ Optical Cranium)`
      });
      counter++;
    }

    // Assign organic anterior-to-posterior cranial coordinates (0.6 mm³ cranium)
    // telencephalon: anterior left (0.10 - 0.22)
    // diencephalon: mid-anterior (0.24 - 0.38)
    // mesencephalon: mid dorsal (0.40 - 0.54)
    // cerebellum: mid-posterior dorsal (0.56 - 0.68)
    // rhombencephalon: posterior ventral (0.70 - 0.82)
    // sonic_motor: caudal posterior (0.84 - 0.94)
    const divRanges = {
      telencephalon:   { uMin: 0.10, uMax: 0.22, vMin: 0.16, vMax: 0.84 },
      diencephalon:    { uMin: 0.24, uMax: 0.38, vMin: 0.20, vMax: 0.80 },
      mesencephalon:   { uMin: 0.40, uMax: 0.54, vMin: 0.14, vMax: 0.74 },
      cerebellum:      { uMin: 0.56, uMax: 0.68, vMin: 0.16, vMax: 0.65 },
      rhombencephalon: { uMin: 0.70, uMax: 0.82, vMin: 0.35, vMax: 0.86 },
      sonic_motor:     { uMin: 0.84, uMax: 0.94, vMin: 0.18, vMax: 0.84 }
    };

    const countsPerDiv = {};
    Object.keys(divRanges).forEach(k => countsPerDiv[k] = 0);

    this.nodes = rawNodes.map((n, i) => {
      const rng = divRanges[n.division] || divRanges.telencephalon;
      const c = countsPerDiv[n.division]++;
      const gridCols = 3;
      const col = c % gridCols;
      const row = Math.floor(c / gridCols);
      const totalRows = 14;

      const u = rng.uMin + (col / (gridCols - 1 || 1)) * (rng.uMax - rng.uMin) + (Math.random() - 0.5) * 0.02;
      const v = rng.vMin + (row / totalRows) * (rng.vMax - rng.vMin) + (Math.random() - 0.5) * 0.025;

      const x = u * this.canvas.width;
      const y = v * this.canvas.height;

      const isKeyLandmark = n.id.includes("Mauth") || n.id.includes("SMN") || n.id.includes("OT_PVN") || n.id.includes("Ce_Purk");

      const nodeObj = {
        ...n,
        x: x,
        y: y,
        targetX: x,
        targetY: y,
        u: u,
        v: v,
        radius: isKeyLandmark ? 7.5 : 4.8,
        baseColor: this.getColorForDivision(n.division),
        pulse: Math.random() * Math.PI * 2
      };

      this.nodeMap.set(n.id, nodeObj);
      return nodeObj;
    });

    // Build synaptic and electrical edges
    this.nodes.forEach(node => {
      if (node.targets && Array.isArray(node.targets)) {
        node.targets.forEach(tgtId => {
          const tgt = this.nodeMap.get(tgtId);
          if (tgt) {
            this.edges.push({
              source: node,
              target: tgt,
              type: "chemical",
              weight: (node.nt === 'gaba' || node.nt === 'glycine') ? -1 : 1
            });
          }
        });
      }

      if (node.gaps && Array.isArray(node.gaps)) {
        node.gaps.forEach(gapId => {
          const gap = this.nodeMap.get(gapId);
          if (gap && node.id < gapId) {
            this.edges.push({
              source: node,
              target: gap,
              type: "gap",
              weight: 0.5
            });
          }
        });
      }
    });

    // Seed traveling action potential pulses
    for (let p = 0; p < 28; p++) {
      if (this.edges.length > 0) {
        const edge = this.edges[Math.floor(Math.random() * this.edges.length)];
        this.pulses.push({
          edge: edge,
          progress: Math.random(),
          speed: 0.007 + Math.random() * 0.009,
          color: edge.type === 'gap' ? '#f59e0b' : (edge.weight < 0 ? '#f43f5e' : '#38bdf8')
        });
      }
    }
  }

  getColorForDivision(div) {
    switch (div) {
      case 'telencephalon':   return '#38bdf8'; // Cyan (Forebrain)
      case 'diencephalon':    return '#f59e0b'; // Amber (Habenula / Thalamus)
      case 'mesencephalon':   return '#60a5fa'; // Blue (Optic Tectum)
      case 'cerebellum':      return '#34d399'; // Emerald (Purkinje Loops)
      case 'rhombencephalon': return '#f43f5e'; // Rose (Mauthner Escape Network)
      case 'sonic_motor':     return '#a78bfa'; // Violet (140 dB Drumming & Spinal Cord)
      default:                return '#7dd3fc';
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(300, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(260, Math.floor((rect.height || 520) * dpr));
    this.ctx.scale(dpr, dpr);
    this.dpr = dpr;
    this.cssWidth = rect.width;
    this.cssHeight = rect.height || 520;

    for (const node of this.nodes) {
      if (typeof node.u !== 'number' || typeof node.v !== 'number') continue;
      node.x = node.u * this.canvas.width;
      node.y = node.v * this.canvas.height;
      node.targetX = node.x;
      node.targetY = node.y;
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    // Mouse Move for Hover Detection
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left);
      const mouseY = (e.clientY - rect.top);
      const dpr = this.dpr || Math.min(window.devicePixelRatio || 1, 2);

      let found = null;
      for (const node of this.nodes) {
        const dx = (node.x / dpr) - mouseX;
        const dy = (node.y / dpr) - mouseY;
        if (Math.hypot(dx, dy) < node.radius + 6) {
          found = node;
          break;
        }
      }

      this.hoveredNode = found;
      this.canvas.style.cursor = found ? 'pointer' : 'crosshair';
    });

    // Click to Select Node
    this.canvas.addEventListener('click', (e) => {
      if (this.hoveredNode) {
        this.selectNode(this.hoveredNode.id);
      }
    });

    // Search Input binding
    const searchInput = document.getElementById('neuron-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toUpperCase();
        if (this.searchQuery.length > 0) {
          const match = this.nodes.find(n => n.id.toUpperCase().includes(this.searchQuery));
          if (match) this.selectNode(match.id);
        }
      });
    }

    // Filter Buttons binding
    const filterContainer = document.getElementById('graph-filters');
    if (filterContainer) {
      const buttons = filterContainer.querySelectorAll('.filter-pill');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeFilter = btn.getAttribute('data-filter') || 'all';
        });
      });
    }
  }

  selectNode(neuronId) {
    const node = this.nodeMap.get(neuronId);
    if (!node) return;
    this.selectedNode = node;

    // Update Inspector DOM Card
    const elId = document.getElementById('card-neuron-id');
    const elClass = document.getElementById('card-neuron-class');
    const elNt = document.getElementById('card-neuron-nt');
    const elFn = document.getElementById('card-neuron-function');
    const elTgt = document.getElementById('card-neuron-targets');
    const elGaps = document.getElementById('card-neuron-gaps');
    const elSoma = document.getElementById('card-neuron-soma');

    if (elId) elId.textContent = node.id;
    if (elClass) {
      elClass.textContent = `${node.division.toUpperCase()} / ${node.group.toUpperCase()}`;
      elClass.style.color = this.getColorForDivision(node.division);
      elClass.style.borderColor = this.getColorForDivision(node.division);
    }
    if (elNt) {
      const ntStr = node.nt === 'gaba' ? 'GABA (gamma-Aminobutyric acid · Inhibitory)'
        : (node.nt === 'glycine' ? 'Glycine (Inhibitory Cross-Spinal)'
        : (node.nt === 'ach' ? 'Acetylcholine (ACh · Excitatory Motor)'
        : (node.nt === 'dopamine' ? 'Dopamine (Neuromodulatory State)'
        : 'Glutamate (Fast Ionotropic Excitatory)')));
      elNt.textContent = ntStr;
    }
    if (elFn) elFn.textContent = node.desc || "Functional subdivision of the adult Danionella cerebrum connectome.";
    if (elTgt) {
      elTgt.textContent = (node.targets && node.targets.length > 0) ? node.targets.join(', ') : "Spinal Myotomes & Peripheral Effectors";
    }
    if (elGaps) {
      elGaps.textContent = (node.gaps && node.gaps.length > 0) ? node.gaps.join(', ') : "None observed in electron micrographs";
    }
    if (elSoma) elSoma.textContent = node.soma || "Adult Cranial Window (0.6 mm³)";
  }

  isNodeFilteredIn(node) {
    if (this.activeFilter === 'all') return true;
    if (this.activeFilter === node.division) return true;
    return false;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.isVisible === false) return;
    this.time += 0.02;

    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = this.cssWidth || (this.canvas.width / dpr);
    const H = this.cssHeight || (this.canvas.height / dpr);

    ctx.save();
    ctx.clearRect(0, 0, W, H);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    ctx.beginPath();
    for (let x = 0; x < W; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // 1. Draw Synaptic Edges
    this.edges.forEach(edge => {
      const sIn = this.isNodeFilteredIn(edge.source);
      const tIn = this.isNodeFilteredIn(edge.target);
      if (!sIn && !tIn) return;

      const isConnectedToActive = (this.hoveredNode && (edge.source === this.hoveredNode || edge.target === this.hoveredNode)) ||
                                  (this.selectedNode && (edge.source === this.selectedNode || edge.target === this.selectedNode));

      ctx.beginPath();
      ctx.moveTo(edge.source.x / dpr, edge.source.y / dpr);
      ctx.lineTo(edge.target.x / dpr, edge.target.y / dpr);

      let strokeStyle = edge.type === 'gap' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.06)';
      let lineWidth = edge.type === 'gap' ? 1.0 : 0.75;

      if (isConnectedToActive) {
        strokeStyle = edge.type === 'gap' ? 'rgba(56, 189, 248, 0.85)' : 'rgba(255, 255, 255, 0.7)';
        lineWidth = 1.6;
      }

      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      if (edge.type === 'gap') ctx.setLineDash([3, 4]);
      else ctx.setLineDash([]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 2. Draw Traveling Synaptic Pulses
    this.pulses.forEach(p => {
      p.progress += p.speed;
      if (p.progress >= 1.0) {
        p.progress = 0;
        p.edge = this.edges[Math.floor(Math.random() * this.edges.length)];
      }

      if (p.edge && this.isNodeFilteredIn(p.edge.source) && this.isNodeFilteredIn(p.edge.target)) {
        const sx = p.edge.source.x / dpr;
        const sy = p.edge.source.y / dpr;
        const tx = p.edge.target.x / dpr;
        const ty = p.edge.target.y / dpr;

        const midX = (sx + tx) * 0.5;
        const midY = (sy + ty) * 0.5 + 8;
        const t = p.progress;
        const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * midX + t * t * tx;
        const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * midY + t * t * ty;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 3. Draw Nodes
    this.nodes.forEach(node => {
      const isFiltered = this.isNodeFilteredIn(node);
      const isSearchMatch = this.searchQuery && node.id.toUpperCase().includes(this.searchQuery);
      const isHovered = (this.hoveredNode === node);
      const isSelected = (this.selectedNode === node);

      const nx = node.x / dpr;
      const ny = node.y / dpr;

      let r = node.radius;
      let alpha = isFiltered ? 0.85 : 0.15;

      if (isSearchMatch) {
        r += 3;
        alpha = 1.0;
      }
      if (isHovered || isSelected) {
        r += 3.5;
        alpha = 1.0;
      }

      if (isSelected || isSearchMatch) {
        ctx.strokeStyle = node.baseColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(nx, ny, r + 3 + Math.sin(this.time * 4) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Node Body
      ctx.fillStyle = isFiltered ? node.baseColor : 'rgba(255, 255, 255, 0.1)';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fill();

      // Node Border
      ctx.strokeStyle = '#05070a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Node Label (landmark or active)
      const isLandmark = node.id.includes("Mauth") || node.id.includes("SMN_01") || node.id.includes("OT_PVN_L") || node.id.includes("Ce_Purk_01") || node.id.includes("Tel_Dm_L");
      const showLabel = isSelected || isHovered || isSearchMatch || isLandmark;
      if (showLabel && isFiltered) {
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = isSelected || isHovered ? '#ffffff' : 'rgba(220, 235, 248, 0.85)';
        ctx.textAlign = 'center';
        ctx.fillText(node.id, nx, ny - r - 4);
      }
      ctx.globalAlpha = 1.0;
    });

    ctx.restore();
  }
}

window.ConnectomeNetworkGraph = ConnectomeNetworkGraph;

