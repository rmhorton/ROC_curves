(function(globalScope){
  const existing = globalScope && globalScope.ROCUtils ? globalScope.ROCUtils : {};
  const ROCUtils = existing;

  function isPlainObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function coerceNumberArray(arr, label, {allowEmpty = false} = {}){
    if(!Array.isArray(arr)) throw new Error(`${label} must be an array.`);
    if(!allowEmpty && arr.length === 0) throw new Error(`${label} must contain at least one value.`);
    return arr.map((value, idx)=>{
      if(value === null || value === undefined) throw new Error(`${label} has missing value at index ${idx}.`);
      let parsed = value;
      if(typeof value === 'string'){
        const trimmed = value.trim();
        if(trimmed === '') throw new Error(`${label} has missing value at index ${idx}.`);
        parsed = trimmed;
      }
      const num = typeof parsed === 'number' ? parsed : Number(parsed);
      if(!Number.isFinite(num)){
        throw new Error(`${label} has invalid numeric value at index ${idx}.`);
      }
      return num;
    });
  }

  function assertSortedAscending(values, label){
    for(let i=1;i<values.length;i++){
      if(values[i] < values[i-1]){
        throw new Error(`${label} must be sorted in ascending order.`);
      }
    }
  }

  function assertWithinRange(values, label, {min = -Infinity, max = Infinity} = {}){
    values.forEach((value, idx)=>{
      if(value < min || value > max){
        throw new Error(`${label} must be within [${min}, ${max}] (invalid value at index ${idx}).`);
      }
    });
  }

  function normalizeBand(band, idx, length, context){
    if(!isPlainObject(band)){
      throw new Error(`${context}.bands[${idx}] must be an object.`);
    }
    const levelSource = band.level ?? band.confidence_level ?? band.credible_level;
    const levelValue = Number(levelSource);
    if(!Number.isFinite(levelValue)){
      throw new Error(`${context}.bands[${idx}].level must be a numeric value.`);
    }
    const lower = coerceNumberArray(band.lower, `${context}.bands[${idx}].lower`);
    const upper = coerceNumberArray(band.upper, `${context}.bands[${idx}].upper`);
    if(lower.length !== length || upper.length !== length){
      throw new Error(`${context}.bands[${idx}] arrays must match fpr/tpr length.`);
    }
    return {level: levelValue, lower, upper};
  }

  function looksLikeCurve(candidate){
    return isPlainObject(candidate) && (Object.prototype.hasOwnProperty.call(candidate, 'fpr') || Object.prototype.hasOwnProperty.call(candidate, 'tpr'));
  }

  ROCUtils.toCanonicalRocObject = function(input, options = {}){
    if(!isPlainObject(input)){
      throw new Error('ROC curve must be an object.');
    }
    const idHint = options.idHint || input.curve_id || input.name || 'curve';
    const context = idHint || 'curve';
    const type = input.type === undefined ? 'ROC' : input.type;
    if(type !== 'ROC'){
      throw new Error(`${context}.type must be "ROC".`);
    }
    const fpr = coerceNumberArray(input.fpr, `${context}.fpr`);
    if(fpr.length === 0){
      throw new Error(`${context}.fpr must contain at least one value.`);
    }
    assertSortedAscending(fpr, `${context}.fpr`);
    assertWithinRange(fpr, `${context}.fpr`, {min: 0, max: 1});

    const tpr = coerceNumberArray(input.tpr, `${context}.tpr`);
    if(tpr.length !== fpr.length){
      throw new Error(`${context} has mismatched fpr/tpr lengths.`);
    }
    assertWithinRange(tpr, `${context}.tpr`, {min: 0, max: 1});

    const canonical = {
      type: 'ROC',
      fpr,
      tpr
    };

    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if(name){
      canonical.name = name;
    }

    if(input.threshold !== undefined){
      const threshold = coerceNumberArray(input.threshold, `${context}.threshold`);
      if(threshold.length !== fpr.length){
        throw new Error(`${context}.threshold length must match fpr/tpr length.`);
      }
      canonical.threshold = threshold;
    }

    if(Array.isArray(input.bands) && input.bands.length){
      const normalizedBands = input.bands
        .map((band, idx)=>normalizeBand(band, idx, fpr.length, context))
        .filter(Boolean);
      if(normalizedBands.length){
        normalizedBands.sort((a,b)=>a.level - b.level);
        canonical.bands = normalizedBands;
      }
    }

    if(isPlainObject(input.metadata)){
      const metadata = {};
      Object.keys(input.metadata).forEach(key=>{
        metadata[key] = input.metadata[key];
      });
      canonical.metadata = metadata;
    }

    return canonical;
  };

  ROCUtils.normalizeRocJson = function(raw, options = {}){
    if(raw === null || raw === undefined){
      throw new Error('ROC JSON content is empty.');
    }
    const canonical = {};
    const usedIds = new Set();
    let autoCounter = 1;
    const defaultCurveName = typeof options.defaultCurveName === 'string'
      ? options.defaultCurveName.trim()
      : null;

    const reserveId = (curveObj, keyHint)=>{
      const candidates = [
        curveObj.curve_id,
        curveObj.id,
        curveObj.name,
        keyHint,
        defaultCurveName
      ];
      for(const rawCandidate of candidates){
        if(typeof rawCandidate !== 'string') continue;
        const trimmed = rawCandidate.trim();
        if(!trimmed) continue;
        if(!usedIds.has(trimmed)){
          usedIds.add(trimmed);
          return trimmed;
        }
      }
      let candidate = '';
      do{
        candidate = `curve_${autoCounter++}`;
      }while(usedIds.has(candidate));
      usedIds.add(candidate);
      return candidate;
    };

    const addCurve = (curveObj, keyHint)=>{
      if(!isPlainObject(curveObj)){
        throw new Error(`Curve entry "${keyHint || 'curve'}" must be an object.`);
      }
      const curveId = reserveId(curveObj, keyHint);
      const canonicalCurve = ROCUtils.toCanonicalRocObject(curveObj, {idHint: curveId});
      if(!canonicalCurve.name){
        canonicalCurve.name = curveId;
      }
      canonical[curveId] = canonicalCurve;
    };

    if(Array.isArray(raw)){
      raw.forEach((curve, idx)=>{
        if(curve && looksLikeCurve(curve)){
          addCurve(curve, curve.curve_id || curve.name || `curve_${idx+1}`);
        }
      });
    }else if(isPlainObject(raw)){
      if(looksLikeCurve(raw)){
        addCurve(raw, raw.curve_id || raw.name || defaultCurveName || 'curve');
      }
      if(Array.isArray(raw.curves)){
        raw.curves.forEach((curve, idx)=>{
          if(curve && looksLikeCurve(curve)){
            addCurve(curve, curve.curve_id || curve.name || `curves_${idx+1}`);
          }
        });
      }
      Object.keys(raw).forEach(key=>{
        if(key === 'curves') return;
        const candidate = raw[key];
        if(looksLikeCurve(candidate)){
          addCurve(candidate, key);
        }
      });
    }else{
      throw new Error('ROC JSON root must be an object or an array.');
    }

    if(!Object.keys(canonical).length){
      throw new Error('No ROC curves were found in the provided ROC JSON.');
    }

    return canonical;
  };

  ROCUtils.parseRocJsonText = function(text, options = {}){
    if(typeof text !== 'string'){
      throw new Error('ROC JSON text must be a string.');
    }
    let raw;
    try{
      raw = JSON.parse(text);
    }catch(err){
      throw new Error(`Invalid ROC JSON: ${err.message || err}`);
    }
    return ROCUtils.normalizeRocJson(raw, options);
  };

  globalScope.ROCUtils = ROCUtils;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
