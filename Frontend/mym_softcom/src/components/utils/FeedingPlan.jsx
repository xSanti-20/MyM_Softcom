// Plan de alimentación basado en el documento del SENA
export const FEEDING_PLAN = {
  PRECEBOS: {
    name: "Precebos",
    weightRange: { min: 6.5, max: 32 },
    duration: 49, // días
    stages: [
      { week: 1, weightRange: { min: 6.5, max: 6.5 }, consumptionPerDay: 0.25, gainPerDay: 0.3 },
      { week: 2, weightRange: { min: 6.5, max: 8.95 }, consumptionPerDay: 0.42, gainPerDay: 0.35 },
      { week: 3, weightRange: { min: 8.95, max: 11.89 }, consumptionPerDay: 0.65, gainPerDay: 0.42 },
      { week: 4, weightRange: { min: 11.89, max: 15.46 }, consumptionPerDay: 0.81, gainPerDay: 0.51 },
      { week: 5, weightRange: { min: 15.46, max: 19.73 }, consumptionPerDay: 0.9, gainPerDay: 0.61 },
      { week: 6, weightRange: { min: 19.73, max: 24.56 }, consumptionPerDay: 1.05, gainPerDay: 0.69 },
      { week: 7, weightRange: { min: 24.56, max: 29.88 }, consumptionPerDay: 1.1, gainPerDay: 0.76 },
    ],
  },
  LEVANTE: {
    name: "Levante",
    weightRange: { min: 30, max: 60 },
    duration: 42, // días
    stages: [
      { range: "30-40", weightRange: { min: 30, max: 40 }, consumptionPerDay: 1.37, days: 16 },
      { range: "40-50", weightRange: { min: 40, max: 50 }, consumptionPerDay: 1.67, days: 14 },
      { range: "50-60", weightRange: { min: 50, max: 60 }, consumptionPerDay: 1.97, days: 12 },
    ],
  },
  ENGORDE: {
    name: "Engorde",
    weightRange: { min: 60, max: 100 },
    duration: 47, // días
    stages: [
      { range: "60-70", weightRange: { min: 60, max: 70 }, consumptionPerDay: 2.18, days: 12 },
      { range: "70-80", weightRange: { min: 70, max: 80 }, consumptionPerDay: 2.36, days: 12 },
      { range: "80-90", weightRange: { min: 80, max: 90 }, consumptionPerDay: 2.41, days: 12 },
      { range: "90-100", weightRange: { min: 90, max: 100 }, consumptionPerDay: 2.6, days: 11 },
    ],
  },
}

export function getStageByWeight(weight) {
  if (weight >= 6.5 && weight <= 32) return "PRECEBOS"
  if (weight >= 30 && weight <= 60) return "LEVANTE"
  if (weight >= 60 && weight <= 100) return "ENGORDE"
  return null
}

export function getRecommendedConsumption(weight, stage) {
  const plan = FEEDING_PLAN[stage]
  if (!plan) return null

  if (stage === "PRECEBOS") {
    const stageData = plan.stages.find((s) => weight >= s.weightRange.min && weight <= s.weightRange.max)
    return stageData ? stageData.consumptionPerDay : null
  }

  if (stage === "LEVANTE" || stage === "ENGORDE") {
    const stageData = plan.stages.find((s) => weight >= s.weightRange.min && weight < s.weightRange.max)
    return stageData ? stageData.consumptionPerDay : null
  }

  return null
}

export function calculateTotalFoodNeeded(averageWeight, numberOfAnimals, consumptionPerAnimal) {
  return numberOfAnimals * consumptionPerAnimal
}
