"""
Danionella cerebrum Anatomical Brain Atlas
Reference: MPI Neurobiology / Janelia Research Campus / Charite Universitaetsmedizin
Adult Danionella cerebrum 3D Whole-Brain Atlas (203 distinct regions).
"""

from typing import List, Dict

# 203 Anatomical Regions grouped by cranial division
DANIO_REGIONS: List[str] = [
    # --- TELENCEPHALON (Forebrain - 32 regions) ---
    "Tel_OlfactoryBulb_Glomerular_L", "Tel_OlfactoryBulb_Glomerular_R",
    "Tel_OlfactoryBulb_Internal_L", "Tel_OlfactoryBulb_Internal_R",
    "Tel_DorsalPallium_Anterior_L", "Tel_DorsalPallium_Anterior_R",
    "Tel_DorsalPallium_Medial_L", "Tel_DorsalPallium_Medial_R",
    "Tel_DorsalPallium_Lateral_L", "Tel_DorsalPallium_Lateral_R",
    "Tel_DorsalPallium_Posterior_L", "Tel_DorsalPallium_Posterior_R",
    "Tel_CentralPallium_L", "Tel_CentralPallium_R",
    "Tel_VentralSubpallium_Dorsal_L", "Tel_VentralSubpallium_Dorsal_R",
    "Tel_VentralSubpallium_Ventral_L", "Tel_VentralSubpallium_Ventral_R",
    "Tel_VentralSubpallium_Lateral_L", "Tel_VentralSubpallium_Lateral_R",
    "Tel_VentralSubpallium_Postcommissural_L", "Tel_VentralSubpallium_Postcommissural_R",
    "Tel_Entopeduncular_Nucleus_L", "Tel_Entopeduncular_Nucleus_R",
    "Tel_Septum_Medial_L", "Tel_Septum_Medial_R",
    "Tel_Septum_Lateral_L", "Tel_Septum_Lateral_R",
    "Tel_AnteriorCommissure", "Tel_OlfactoryTract_L", "Tel_OlfactoryTract_R",
    "Tel_Precommissural_Area",

    # --- DIENCEPHALON (Thalamus, Habenula, Hypothalamus - 42 regions) ---
    "Di_Epithalamus_PinealOrgan", "Di_Epithalamus_Parapineal",
    "Di_Habenula_Dorsomedial_L", "Di_Habenula_Dorsolateral_L",
    "Di_Habenula_Ventral_L", "Di_Habenula_Dorsomedial_R",
    "Di_Habenula_Dorsolateral_R", "Di_Habenula_Ventral_R",
    "Di_Fasciculus_Retroflexus_L", "Di_Fasciculus_Retroflexus_R",
    "Di_PreopticArea_Anterior_L", "Di_PreopticArea_Anterior_R",
    "Di_PreopticArea_Magnocellular_L", "Di_PreopticArea_Magnocellular_R",
    "Di_PreopticArea_Parvocellular_L", "Di_PreopticArea_Parvocellular_R",
    "Di_Thalamus_AnteriorNucleus_L", "Di_Thalamus_AnteriorNucleus_R",
    "Di_Thalamus_DorsalNucleus_L", "Di_Thalamus_DorsalNucleus_R",
    "Di_Thalamus_VentralNucleus_L", "Di_Thalamus_VentralNucleus_R",
    "Di_Thalamus_Intermediate_L", "Di_Thalamus_Intermediate_R",
    "Di_Hypothalamus_Periventricular_L", "Di_Hypothalamus_Periventricular_R",
    "Di_Hypothalamus_LateralTuberal_L", "Di_Hypothalamus_LateralTuberal_R",
    "Di_Hypothalamus_InferiorLobe_L", "Di_Hypothalamus_InferiorLobe_R",
    "Di_Hypothalamus_PosteriorRecess_L", "Di_Hypothalamus_PosteriorRecess_R",
    "Di_PituitaryGland", "Di_Pretectum_Superficial_L", "Di_Pretectum_Superficial_R",
    "Di_Pretectum_Central_L", "Di_Pretectum_Central_R",
    "Di_Pretectum_Deep_L", "Di_Pretectum_Deep_R",
    "Di_Subthalamic_Nucleus_L", "Di_Subthalamic_Nucleus_R",

    # --- MESENCEPHALON (Optic Tectum & Tegmentum - 46 regions) ---
    "Mes_OpticTectum_StratumOpticum_L", "Mes_OpticTectum_StratumOpticum_R",
    "Mes_OpticTectum_StratumFibrosum_L", "Mes_OpticTectum_StratumFibrosum_R",
    "Mes_OpticTectum_StratumGriseumCentrale_L", "Mes_OpticTectum_StratumGriseumCentrale_R",
    "Mes_OpticTectum_StratumAlbumCentrale_L", "Mes_OpticTectum_StratumAlbumCentrale_R",
    "Mes_OpticTectum_PeriventricularLayer_L", "Mes_OpticTectum_PeriventricularLayer_R",
    "Mes_OpticTectum_SuperficialInterneurons_L", "Mes_OpticTectum_SuperficialInterneurons_R",
    "Mes_TorusSemicircularis_Central_L", "Mes_TorusSemicircularis_Central_R",
    "Mes_TorusSemicircularis_Ventrolateral_L", "Mes_TorusSemicircularis_Ventrolateral_R",
    "Mes_TorusLongitudinalis_L", "Mes_TorusLongitudinalis_R",
    "Mes_Tegmentum_DorsalRaphe", "Mes_Tegmentum_SuperiorReticular_L", "Mes_Tegmentum_SuperiorReticular_R",
    "Mes_Tegmentum_OculomotorNucleus_L", "Mes_Tegmentum_OculomotorNucleus_R",
    "Mes_Tegmentum_TrochlearNucleus_L", "Mes_Tegmentum_TrochlearNucleus_R",
    "Mes_Tegmentum_EdingerWestphal_L", "Mes_Tegmentum_EdingerWestphal_R",
    "Mes_InterpeduncularNucleus_Dorsal", "Mes_InterpeduncularNucleus_Ventral",
    "Mes_InterpeduncularNucleus_Lateral_L", "Mes_InterpeduncularNucleus_Lateral_R",
    "Mes_RedNucleus_L", "Mes_RedNucleus_R",
    "Mes_SubstantiaNigra_L", "Mes_SubstantiaNigra_R",
    "Mes_OpticChiasm", "Mes_CommissuraAnsulata",
    "Mes_NucleusIsthmi_L", "Mes_NucleusIsthmi_R",
    "Mes_LaterodorsalTegmental_L", "Mes_LaterodorsalTegmental_R",
    "Mes_PeriaqueductalGray_Dorsal", "Mes_PeriaqueductalGray_Ventral",
    "Mes_MesencephalicLocomotorRegion_L", "Mes_MesencephalicLocomotorRegion_R",

    # --- METENCEPHALON (Cerebellum - 24 regions) ---
    "Ce_CorpusCerebelli_GranuleLayer_L", "Ce_CorpusCerebelli_GranuleLayer_R",
    "Ce_CorpusCerebelli_PurkinjeLayer_L", "Ce_CorpusCerebelli_PurkinjeLayer_R",
    "Ce_CorpusCerebelli_MolecularLayer_L", "Ce_CorpusCerebelli_MolecularLayer_R",
    "Ce_ValvulaCerebelli_Granule_L", "Ce_ValvulaCerebelli_Granule_R",
    "Ce_ValvulaCerebelli_Purkinje_L", "Ce_ValvulaCerebelli_Purkinje_R",
    "Ce_ValvulaCerebelli_Molecular_L", "Ce_ValvulaCerebelli_Molecular_R",
    "Ce_LobusCaudalis_Granule", "Ce_LobusCaudalis_Purkinje", "Ce_LobusCaudalis_Molecular",
    "Ce_CristaCerebellaris_L", "Ce_CristaCerebellaris_R",
    "Ce_EminentiaGranularis_L", "Ce_EminentiaGranularis_R",
    "Ce_EurydendroidCells_L", "Ce_EurydendroidCells_R",
    "Ce_DeepCerebellarNuclei_L", "Ce_DeepCerebellarNuclei_R",
    "Ce_ClimbingFiberTract",

    # --- MYELENCEPHALON / RHOMBENCEPHALON (Hindbrain & Auditory - 35 regions) ---
    "Rh_Mauthner_Neuron_CellBody_L", "Rh_Mauthner_Neuron_CellBody_R",
    "Rh_Mauthner_LateralDendrite_L", "Rh_Mauthner_LateralDendrite_R",
    "Rh_Mauthner_VentralDendrite_L", "Rh_Mauthner_VentralDendrite_R",
    "Rh_Mauthner_AxonTract_L", "Rh_Mauthner_AxonTract_R",
    "Rh_InferiorOlive_L", "Rh_InferiorOlive_R",
    "Rh_VestibularNucleus_Descending_L", "Rh_VestibularNucleus_Descending_R",
    "Rh_VestibularNucleus_Medial_L", "Rh_VestibularNucleus_Medial_R",
    "Rh_VestibularNucleus_Lateral_L", "Rh_VestibularNucleus_Lateral_R",
    "Rh_AuditoryNucleus_Magnocellular_L", "Rh_AuditoryNucleus_Magnocellular_R",
    "Rh_AuditoryNucleus_Angular_L", "Rh_AuditoryNucleus_Angular_R",
    "Rh_LateralLine_MedialNucleus_L", "Rh_LateralLine_MedialNucleus_R",
    "Rh_LateralLine_CaudalNucleus_L", "Rh_LateralLine_CaudalNucleus_R",
    "Rh_VagalLobe_Sensory_L", "Rh_VagalLobe_Sensory_R",
    "Rh_VagalLobe_Motor_L", "Rh_VagalLobe_Motor_R",
    "Rh_Reticulospinal_RoM2_L", "Rh_Reticulospinal_RoM2_R",
    "Rh_Reticulospinal_RoM3_L", "Rh_Reticulospinal_RoM3_R",
    "Rh_Reticulospinal_MiD2_L", "Rh_Reticulospinal_MiD2_R",
    "Rh_Glossopharyngeal_Nucleus_L", "Rh_Glossopharyngeal_Nucleus_R",
    "Rh_SolitaryTractNucleus",

    # --- MOTOR & SONIC DRUMMING APPARATUS (Specialized Danionella Motor - 24 regions) ---
    # Danionella generates >140 dB sonic drumming pulses via specialized sonic motor nucleus
    "Sonic_Drumming_MotorNucleus_L", "Sonic_Drumming_MotorNucleus_R",
    "Sonic_PreMotor_PatternGenerator_L", "Sonic_PreMotor_PatternGenerator_R",
    "Sonic_SwimBladder_Proprioceptor_L", "Sonic_SwimBladder_Proprioceptor_R",
    "Sonic_CartilageResonance_Sensor_L", "Sonic_CartilageResonance_Sensor_R",
    "Sp_VentralRoot_Segment1_Motor_L", "Sp_VentralRoot_Segment1_Motor_R",
    "Sp_VentralRoot_Segment2_Motor_L", "Sp_VentralRoot_Segment2_Motor_R",
    "Sp_VentralRoot_Segment3_Motor_L", "Sp_VentralRoot_Segment3_Motor_R",
    "Sp_VentralRoot_Segment4_Motor_L", "Sp_VentralRoot_Segment4_Motor_R",
    "Sp_CaudalPeduncle_FinSteering_L", "Sp_CaudalPeduncle_FinSteering_R",
    "Sp_PectoralFin_Abductor_L", "Sp_PectoralFin_Abductor_R",
    "Sp_PectoralFin_Adductor_L", "Sp_PectoralFin_Adductor_R",
    "Sp_CentralPatternGenerator_Oscillator_L", "Sp_CentralPatternGenerator_Oscillator_R"
]

TOTAL_REGIONS = len(DANIO_REGIONS)
assert TOTAL_REGIONS == 203, f"Expected 203 regions, got {TOTAL_REGIONS}"

# Major division lookup for macro telemetry
DIVISION_MAP: Dict[str, str] = {}
for r in DANIO_REGIONS:
    if r.startswith("Tel_"):
        DIVISION_MAP[r] = "Telencephalon"
    elif r.startswith("Di_"):
        DIVISION_MAP[r] = "Diencephalon"
    elif r.startswith("Mes_"):
        DIVISION_MAP[r] = "Mesencephalon"
    elif r.startswith("Ce_"):
        DIVISION_MAP[r] = "Cerebellum"
    elif r.startswith("Rh_"):
        DIVISION_MAP[r] = "Rhombencephalon"
    elif r.startswith("Sonic_") or r.startswith("Sp_"):
        DIVISION_MAP[r] = "Motor & Sonic Drumming"
    else:
        DIVISION_MAP[r] = "Unassigned"

# Division weights for neuron allocation (summing to ~650,000)
# Cerebellum and Optic Tectum contain the vast majority of granular and optical neurons
DIVISION_NEURON_RATIOS = {
    "Telencephalon": 0.08,           # ~52,000 neurons
    "Diencephalon": 0.07,            # ~45,500 neurons
    "Mesencephalon": 0.35,           # ~227,500 neurons (huge optic tectum & visual layers)
    "Cerebellum": 0.38,              # ~247,000 neurons (densely packed granule cells)
    "Rhombencephalon": 0.08,         # ~52,000 neurons (hindbrain, vestibular, Mauthner)
    "Motor & Sonic Drumming": 0.04   # ~26,000 neurons (spinal pools + drumming nucleus)
}
