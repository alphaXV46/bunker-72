function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseHour(hourText) {
  const match = String(hourText || '0').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

const ENDING_IDS = ['ending_bad', 'ending_normal', 'ending_best', 'ending_fatal', 'ending_secret_best', 'ending_secret_bad'];

export class GameModel {
  constructor() {
    this.currentSceneId = 'day1_start';
    this.knowledge = 5;
    this.history = [];
    this.flags = {};
    this.inventory = { food: 2, drink: 2, kit: 1 };
  }

  init(sceneId, knowledge, history = [], flags = null, inventory = null) {
    this.currentSceneId = sceneId || 'day1_start';
    this.knowledge = typeof knowledge === 'number' ? knowledge : 5;
    this.history = Array.isArray(history) ? history : [];
    this.inventory = inventory || { food: 2, drink: 2, kit: 1 };

    if (flags) {
      this.flags = flags;
    } else {
      const FLAG_CHOICE_MAP = {
        'c_day2_panic_exit':       'structural_damage',
        'c_day2_radio_schedule':   'radio_saved',
        'c_day2_power_save':       'power_saved',
        'c_day2_power_save_drain': 'power_saved',
        'c_day3_water_filter':     'water_filtered',
        'c_day3_door_open':        'door_opened',
      };

      this.flags = {};
      this.history.forEach(entry => {
        if (entry.choiceId && FLAG_CHOICE_MAP[entry.choiceId]) {
          this.flags[FLAG_CHOICE_MAP[entry.choiceId]] = true;
          return;
        }
        if (entry.text === 'Hampir membuka pintu keluar dalam kondisi panik.') this.flags.structural_damage = true;
        if (entry.text === 'Radio dipakai dengan jadwal hemat baterai.')         this.flags.radio_saved = true;
        if (entry.text === 'Daya bunker dialihkan ke mode hemat.')               this.flags.power_saved = true;
        if (entry.text === 'Air disaring filter karbon dan klorin.')             this.flags.water_filtered = true;
        if (entry.text === 'Pintu dibuka untuk pihak tak verifikasi.')           this.flags.door_opened = true;
      });
    }
  }

  isInventoryDisabledScene(sceneId) {
    const disabledScenes = ['ending_eval', 'day4_eval', 'trigger_ending_eval', 'trigger_secret_ending_eval'];
    return disabledScenes.includes(sceneId) || ENDING_IDS.includes(sceneId);
  }

  useInventoryItem(key) {
    if (this.inventory[key] && this.inventory[key] > 0) {
      this.inventory[key] -= 1;
      const effect = (key === 'kit') ? 2 : 1;
      this.knowledge = clamp(this.knowledge + effect, 0, 15);
      const label = key === 'food' ? 'Makanan' : key === 'drink' ? 'Air' : 'P3K';
      return { effect, label };
    }
    return null;
  }

  evaluateEnding() {
    const hasRadioSave = this.flags.radio_saved === true;
    const hasWaterFilter = this.flags.water_filtered === true;
    const qualifiesForDay4 = this.knowledge >= 8 && hasRadioSave && hasWaterFilter;

    if (qualifiesForDay4) {
      return 'day4_intro';
    } else {
      const doorOpened = this.flags.door_opened === true;
      if (this.knowledge === 0 || doorOpened) {
        return 'ending_fatal';
      } else if (this.knowledge >= 1 && this.knowledge <= 4) {
        return 'ending_bad';
      } else if (this.knowledge >= 5 && this.knowledge <= 7) {
        return 'ending_normal';
      } else {
        return 'ending_best';
      }
    }
  }

  evaluateSecretEnding() {
    const hasStructuralDamage = this.flags.structural_damage === true;
    if (this.knowledge >= 12 && !hasStructuralDamage) {
      return 'ending_secret_best';
    } else {
      return 'ending_secret_bad';
    }
  }

  getEndingSummary() {
    const good = this.history.filter((entry) => entry.effect > 0).length;
    const risky = this.history.filter((entry) => entry.effect < 0).length;
    return `Keputusan aman: ${good}. Keputusan berisiko: ${risky}. Jalur terakhir: ${this.history.map((entry) => entry.hour).join(' > ') || 'tidak ada log'}.`;
  }
}
