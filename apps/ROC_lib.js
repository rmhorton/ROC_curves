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
      // if(!Number.isFinite(num)){
      //   throw new Error(`${label} has invalid numeric value at index ${idx}.`);
      // }
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

  function splitCsvLine(line){
    const result = [];
    let current = '';
    let inQuotes = false;
    for(let i=0;i<line.length;i++){
      const char = line[i];
      if(char === '"'){
        if(inQuotes && line[i+1] === '"'){
          current += '"';
          i++;
        }else{
          inQuotes = !inQuotes;
        }
      }else if(char === ',' && !inQuotes){
        result.push(current);
        current = '';
      }else{
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  function parseRequiredCsvNumber(value, label, rowNumber){
    const num = parseOptionalCsvNumber(value, label, rowNumber);
    if(num === null){
      throw new Error(`${label} is required on row ${rowNumber}.`);
    }
    return num;
  }

  function parseOptionalCsvNumber(value, label, rowNumber){
    if(value === undefined || value === null) return null;
    const trimmed = typeof value === 'string' ? value.trim() : String(value);
    if(trimmed === ''){
      return null;
    }
    const num = Number(trimmed);
    if(!Number.isFinite(num)){
      throw new Error(`${label} must be numeric on row ${rowNumber}.`);
    }
    return num;
  }

  function formatBandLevelLabel(level){
    if(level === null || level === undefined){
      return '';
    }
    if(typeof level === 'number' && Number.isFinite(level)){
      let str = level.toString();
      if(!str.includes('e') && str.includes('.')){
        str = str.replace(/0+$/,'').replace(/\.$/,'');
      }
      return str;
    }
    const trimmed = String(level).trim();
    return trimmed.replace(/\s+/g,'_');
  }

  function getBandSortValue(level){
    if(typeof level === 'number' && Number.isFinite(level)){
      return level;
    }
    const parsed = Number(String(level).trim());
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  }

  function escapeCsvValue(value){
    const str = value === undefined || value === null ? '' : String(value);
    if(/[",\n]/.test(str)){
      return `"${str.replace(/"/g,'""')}"`;
    }
    return str;
  }

  function formatCsvNumber(value){
    return Number.isFinite(value) ? Number(value).toString() : '';
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

    if (input.threshold !== undefined) {
      if (!Array.isArray(input.threshold)) {
        throw new Error(`${context}.threshold must be an array.`);
      }
      if (input.threshold.length !== fpr.length) {
        throw new Error(`${context}.threshold length must match fpr/tpr length.`);
      }

      // Allow null/undefined threshold entries (e.g., endpoints inserted by validator).
      const threshold = input.threshold.map((value, idx) => {
        if (value === null || value === undefined) {
          // Preserve null explicitly: this means "no finite threshold at this point"
          return null;
        }
        let parsed = value;
        if (typeof parsed === 'string') {
          const trimmed = parsed.trim();
          if (trimmed === '') {
            return null; // empty string treated like missing
          }
          parsed = trimmed;
        }
        const num = typeof parsed === 'number' ? parsed : Number(parsed);
        return num; // may be NaN or Infinity; ROCUtility logic can handle non-finite values
      });

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

  ROCUtils.parseRocCsvText = function(text){
    if(typeof text !== 'string' || !text.trim()){
      throw new Error('ROC CSV text must be a non-empty string.');
    }
    const rawLines = text.split(/\r?\n/);
    const lines = [];
    rawLines.forEach((line)=>{
      if(line === undefined || line === null) return;
      const trimmed = line.trim();
      if(!trimmed || trimmed.startsWith('#')) return;
      lines.push(line);
    });
    if(!lines.length){
      throw new Error('ROC CSV text does not contain any data rows.');
    }
    const headerLine = lines[0].replace(/^\uFEFF/, '');
    const headerCells = splitCsvLine(headerLine).map(cell=>cell.trim());
    if(!headerCells.length){
      throw new Error('ROC CSV header row is empty.');
    }
    const headerIndex = new Map();
    headerCells.forEach((name, idx)=>{
      if(!name) return;
      headerIndex.set(name.toLowerCase(), idx);
    });

    const curveIdIdx = headerIndex.get('curve_id');
    const fprIdx = headerIndex.get('fpr');
    const tprIdx = headerIndex.get('tpr');
    if(curveIdIdx === undefined || fprIdx === undefined || tprIdx === undefined){
      throw new Error('ROC CSV must include curve_id, fpr, and tpr columns.');
    }
    const thresholdIdx = headerIndex.has('threshold') ? headerIndex.get('threshold') : undefined;

    const bandColumns = {};
    headerCells.forEach((name, idx)=>{
      if(!name) return;
      const normalized = name.toLowerCase();
      const match = normalized.match(/^(lower|upper)_(.+)$/);
      if(!match) return;
      const kind = match[1];
      const levelToken = name.slice(name.indexOf('_') + 1).trim();
      if(!levelToken){
        throw new Error('Band columns must specify a numeric level, e.g., lower_0.95.');
      }
      const key = formatBandLevelLabel(levelToken);
      if(!bandColumns[key]){
        const numericLevel = Number(levelToken);
        bandColumns[key] = {
          key,
          label: key,
          rawLabel: levelToken,
          levelValue: Number.isFinite(numericLevel) ? numericLevel : levelToken.trim(),
          lowerIdx: undefined,
          upperIdx: undefined
        };
      }
      if(kind === 'lower'){
        bandColumns[key].lowerIdx = idx;
      }else{
        bandColumns[key].upperIdx = idx;
      }
    });
    const bandEntries = Object.values(bandColumns);
    bandEntries.forEach((entry)=>{
      if(typeof entry.lowerIdx !== 'number' || typeof entry.upperIdx !== 'number'){
        throw new Error(`Band level "${entry.rawLabel}" must include both lower_ and upper_ columns.`);
      }
    });

    const groups = new Map();
    const getGroup = (curveId)=>{
      if(!groups.has(curveId)){
        const group = {
          id: curveId,
          fpr: [],
          tpr: [],
          threshold: typeof thresholdIdx === 'number' ? [] : null,
          bands: new Map()
        };
        bandEntries.forEach(entry=>{
          group.bands.set(entry.key, {
            info: entry,
            lower: [],
            upper: []
          });
        });
        groups.set(curveId, group);
      }
      return groups.get(curveId);
    };

    const dataLines = lines.slice(1);
    if(!dataLines.length){
      throw new Error('ROC CSV must include at least one data row.');
    }
    dataLines.forEach((line, index)=>{
      const trimmed = line.trim();
      if(!trimmed) return;
      const row = splitCsvLine(line);
      const rowNumber = index + 2;
      const idCell = row[curveIdIdx] !== undefined ? row[curveIdIdx] : '';
      const curveId = typeof idCell === 'string' ? idCell.trim() : String(idCell).trim();
      if(!curveId){
        throw new Error(`curve_id is required on row ${rowNumber}.`);
      }
      const group = getGroup(curveId);
      const fprVal = parseRequiredCsvNumber(row[fprIdx], `${curveId}.fpr`, rowNumber);
      const tprVal = parseRequiredCsvNumber(row[tprIdx], `${curveId}.tpr`, rowNumber);
      group.fpr.push(fprVal);
      group.tpr.push(tprVal);
      if(group.threshold){
        const thrVal = parseOptionalCsvNumber(row[thresholdIdx], `${curveId}.threshold`, rowNumber);
        group.threshold.push(thrVal);
      }
      bandEntries.forEach(entry=>{
        const bandRef = group.bands.get(entry.key);
        const lowerVal = parseOptionalCsvNumber(row[entry.lowerIdx], `${curveId}.lower_${entry.label}`, rowNumber);
        const upperVal = parseOptionalCsvNumber(row[entry.upperIdx], `${curveId}.upper_${entry.label}`, rowNumber);
        bandRef.lower.push(lowerVal);
        bandRef.upper.push(upperVal);
      });
    });

    if(!groups.size){
      throw new Error('ROC CSV did not contain any valid curve data.');
    }

    const canonical = {};
    groups.forEach(group=>{
      if(!group.fpr.length){
        return;
      }
      const base = {
        type: 'ROC',
        name: group.id,
        fpr: group.fpr.slice(),
        tpr: group.tpr.slice()
      };
      if(group.threshold){
        const hasValues = group.threshold.some(value=>value !== null);
        const hasMissing = group.threshold.some(value=>value === null);
        if(hasMissing && hasValues){
          throw new Error(`${group.id}.threshold column must contain a numeric value for every row.`);
        }
        if(hasValues){
          base.threshold = group.threshold.slice();
        }
      }
      const bands = [];
      bandEntries.forEach(entry=>{
        const bandRef = group.bands.get(entry.key);
        if(!bandRef) return;
        const hasLower = bandRef.lower.some(value=>value !== null);
        const hasUpper = bandRef.upper.some(value=>value !== null);
        if(hasLower !== hasUpper){
          throw new Error(`${group.id} band level "${entry.rawLabel}" must include both lower and upper values.`);
        }
        if(hasLower){
          const lowerMissing = bandRef.lower.some(value=>value === null);
          const upperMissing = bandRef.upper.some(value=>value === null);
          if(lowerMissing || upperMissing){
            throw new Error(`${group.id} band level "${entry.rawLabel}" has missing values.`);
          }
          bands.push({
            level: entry.levelValue,
            lower: bandRef.lower.slice(),
            upper: bandRef.upper.slice()
          });
        }
      });
      if(bands.length){
        bands.sort((a,b)=>{
          const aVal = getBandSortValue(a.level);
          const bVal = getBandSortValue(b.level);
          if(aVal === bVal){
            const aLabel = formatBandLevelLabel(a.level);
            const bLabel = formatBandLevelLabel(b.level);
            return aLabel.localeCompare(bLabel);
          }
          return aVal - bVal;
        });
        base.bands = bands;
      }
      const canonicalCurve = ROCUtils.toCanonicalRocObject(base, {idHint: group.id});
      canonical[group.id] = canonicalCurve;
    });

    if(!Object.keys(canonical).length){
      throw new Error('ROC CSV did not contain any complete curves.');
    }

    return canonical;
  };

  ROCUtils.rocToCsv = function(curves){
    if(!curves || typeof curves !== 'object'){
      throw new Error('ROC CSV export requires a map of curves.');
    }
    const curveIds = Object.keys(curves);
    if(!curveIds.length){
      throw new Error('ROC CSV export requires at least one curve.');
    }
    const canonicalEntries = curveIds.map(id=>{
      const curve = curves[id];
      if(!curve || typeof curve !== 'object'){
        throw new Error(`Curve "${id}" is missing or invalid.`);
      }
      const canonicalCurve = ROCUtils.toCanonicalRocObject(curve, {idHint: id});
      if(!canonicalCurve.name){
        canonicalCurve.name = id;
      }
      return {id, curve: canonicalCurve};
    }).sort((a,b)=>a.id.localeCompare(b.id));

    const includeThreshold = canonicalEntries.some(entry=>Array.isArray(entry.curve.threshold));
    const bandLevelMap = new Map();
    canonicalEntries.forEach(({curve})=>{
      if(!Array.isArray(curve.bands)) return;
      curve.bands.forEach(band=>{
        const key = formatBandLevelLabel(band.level);
        if(!bandLevelMap.has(key)){
          bandLevelMap.set(key, {
            key,
            sortValue: getBandSortValue(band.level),
            level: band.level
          });
        }
      });
    });
    const bandLevels = Array.from(bandLevelMap.values()).sort((a,b)=>{
      if(a.sortValue === b.sortValue){
        return a.key.localeCompare(b.key);
      }
      return a.sortValue - b.sortValue;
    });

    const header = ['curve_id', 'fpr', 'tpr'];
    if(includeThreshold){
      header.push('threshold');
    }
    bandLevels.forEach(info=>{
      header.push(`lower_${info.key}`);
      header.push(`upper_${info.key}`);
    });

    const rows = [header.map(escapeCsvValue).join(',')];
    canonicalEntries.forEach(({id, curve})=>{
      const length = curve.fpr.length;
      const bandByKey = new Map();
      (curve.bands || []).forEach(band=>{
        bandByKey.set(formatBandLevelLabel(band.level), band);
      });
      for(let i=0;i<length;i++){
        const row = [
          id,
          formatCsvNumber(curve.fpr[i]),
          formatCsvNumber(curve.tpr[i])
        ];
        if(includeThreshold){
          const thr = Array.isArray(curve.threshold) ? curve.threshold[i] : null;
          row.push(formatCsvNumber(thr));
        }
        bandLevels.forEach(info=>{
          const band = bandByKey.get(info.key);
          if(band){
            row.push(formatCsvNumber(band.lower[i]));
            row.push(formatCsvNumber(band.upper[i]));
          }else{
            row.push('');
            row.push('');
          }
        });
        rows.push(row.map(escapeCsvValue).join(','));
      }
    });

    return rows.join('\n');
  };

  ROCUtils.toRocJsonBlob = function(curves, filename = 'roc_curves.json'){
    if(typeof Blob === 'undefined'){
      throw new Error('Blob is not supported in this environment.');
    }
    if(!curves || typeof curves !== 'object' || !Object.keys(curves).length){
      throw new Error('ROC JSON export requires at least one curve.');
    }
    const serialized = JSON.stringify(curves, null, 2);
    const blob = new Blob([serialized], {type: 'application/json'});
    blob.filename = filename;
    return blob;
  };

  ROCUtils.computeEmpiricalRoc = function(points){
    if(!Array.isArray(points) || !points.length){
      return [];
    }
    const sorted = points
      .filter(item=>{
        return item && Number.isFinite(Number(item.score)) && (item.label === 0 || item.label === 1);
      })
      .map(item=>({score:Number(item.score), label:item.label ? 1 : 0}))
      .sort((a,b)=>b.score - a.score);
    if(!sorted.length){
      return [];
    }
    const totalPos = sorted.reduce((acc,item)=>acc + (item.label === 1 ? 1 : 0), 0);
    const totalNeg = sorted.length - totalPos;
    if(totalPos === 0 || totalNeg === 0){
      return [];
    }
    const roc = [{fpr:0, tpr:0, thr:Number.POSITIVE_INFINITY}];
    let tp = 0;
    let fp = 0;
    for(let i=0;i<sorted.length;){
      const currentScore = sorted[i].score;
      while(i<sorted.length && sorted[i].score === currentScore){
        if(sorted[i].label === 1){
          tp += 1;
        }else{
          fp += 1;
        }
        i += 1;
      }
      roc.push({
        fpr: fp / totalNeg,
        tpr: tp / totalPos,
        thr: currentScore
      });
    }
    roc.push({fpr:1, tpr:1, thr:Number.NEGATIVE_INFINITY});
    return roc.sort((a,b)=>a.fpr - b.fpr || a.tpr - b.tpr);
  };

  ROCUtils.ensureMonotoneRoc = function(points){
    if(!Array.isArray(points)){
      return [];
    }
    const clean = points
      .filter(p=>Number.isFinite(p?.fpr) && Number.isFinite(p?.tpr))
      .map(p=>({fpr:Number(p.fpr), tpr:Number(p.tpr), thr:p.thr}));
    clean.sort((a,b)=>a.fpr - b.fpr);
    const dedup = [];
    for(const point of clean){
      const last = dedup[dedup.length - 1];
      if(last && last.fpr === point.fpr){
        if(point.tpr > last.tpr){
          last.tpr = point.tpr;
          last.thr = point.thr;
        }
      }else{
        dedup.push({...point});
      }
    }
    for(let i=1;i<dedup.length;i++){
      if(dedup[i].tpr < dedup[i-1].tpr){
        dedup[i].tpr = dedup[i-1].tpr;
      }
    }
    return dedup;
  };

  ROCUtils.computeAuc = function(points){
    if(!Array.isArray(points) || points.length < 2){
      return 0;
    }
    let auc = 0;
    for(let i=1;i<points.length;i++){
      const prev = points[i-1];
      const curr = points[i];
      if(!Number.isFinite(prev.fpr) || !Number.isFinite(prev.tpr) || !Number.isFinite(curr.fpr) || !Number.isFinite(curr.tpr)){
        continue;
      }
      const dx = curr.fpr - prev.fpr;
      if(Number.isFinite(dx)){
        auc += dx * (curr.tpr + prev.tpr) / 2;
      }
    }
    return auc;
  };

  ROCUtils.validateRocCurve = function(curve, curveId){
    const id = String(curveId || (curve && curve.name) || 'curve');
    const report = {
      ok: true,
      fatal: false,
      fixed: false,
      warnings: [],
      errors: [],
      notes: [],
      curveId: id
    };
    if(!curve || typeof curve !== 'object'){
      report.ok = false;
      report.fatal = true;
      report.errors.push('Curve is missing or not an object.');
      return report;
    }
    const fpr = Array.isArray(curve.fpr) ? curve.fpr.map(Number) : null;
    const tpr = Array.isArray(curve.tpr) ? curve.tpr.map(Number) : null;
    if(!fpr || !tpr){
      report.ok = false;
      report.fatal = true;
      report.errors.push('Curve must include numeric fpr and tpr arrays.');
      return report;
    }
    if(fpr.length !== tpr.length){
      report.ok = false;
      report.fatal = true;
      report.errors.push(`fpr/tpr length mismatch (${fpr.length} vs ${tpr.length}).`);
      return report;
    }
    if(!fpr.length){
      report.ok = false;
      report.fatal = true;
      report.errors.push('Curve must contain at least one point.');
      return report;
    }
    for(let i=0;i<fpr.length;i++){
      if(!Number.isFinite(fpr[i]) || !Number.isFinite(tpr[i])){
        report.ok = false;
        report.fatal = true;
        report.errors.push(`Non-numeric value at index ${i}.`);
        return report;
      }
      if(i>0){
        if(fpr[i] < fpr[i-1] - 1e-9){
          report.ok = false;
          report.fatal = true;
          report.errors.push(`fpr decreases at index ${i} (${fpr[i-1]} → ${fpr[i]}).`);
          return report;
        }
        if(tpr[i] < tpr[i-1] - 1e-6){
          report.ok = false;
          report.fatal = true;
          report.errors.push(`tpr decreases at index ${i} (${tpr[i-1]} → ${tpr[i]}).`);
          return report;
        }
      }
    }
    const revised = [];
    for(let i=0;i<fpr.length;i++){
      const last = revised[revised.length - 1];
      const current = {fpr:fpr[i], tpr:tpr[i], thr:Array.isArray(curve.threshold) ? curve.threshold[i] : undefined};
      if(last && Math.abs(current.fpr - last.fpr) < 1e-9 && Math.abs(current.tpr - last.tpr) < 1e-9){
        report.warnings.push(`Duplicate point at index ${i} removed.`);
        report.fixed = true;
        continue;
      }
      if(last && current.fpr < last.fpr){
        current.fpr = last.fpr;
        report.warnings.push(`Adjusted fpr at index ${i} to maintain monotonicity.`);
        report.fixed = true;
      }
      if(last && current.tpr < last.tpr){
        current.tpr = last.tpr;
        report.warnings.push(`Adjusted tpr at index ${i} to maintain monotonicity.`);
        report.fixed = true;
      }
      revised.push(current);
    }
    const hasZero = revised.some(pt=>Math.abs(pt.fpr) < 1e-9 && Math.abs(pt.tpr) < 1e-9);
    const hasOne = revised.some(pt=>Math.abs(pt.fpr-1) < 1e-9 && Math.abs(pt.tpr-1) < 1e-9);
    if(!hasZero || !hasOne){
      report.notes.push('This ROC curve does not include (0,0) or (1,1). This is normal for heavy-tailed distributions with asymptotic CDF tails. No correction needed.');
    }
    if(report.fixed){
      curve.fpr = revised.map(pt=>pt.fpr);
      curve.tpr = revised.map(pt=>pt.tpr);
      if(Array.isArray(curve.threshold)){
        const thresholds = [];
        revised.forEach(pt=>{
          thresholds.push(pt.thr === undefined ? null : pt.thr);
        });
        curve.threshold = thresholds;
      }
    }
    report.ok = !report.fatal;
    return report;
  };

  ROCUtils.validateRocMap = function(map){
    const results = {};
    if(!map || typeof map !== 'object'){
      return results;
    }
    Object.keys(map).forEach(curveId=>{
      const curve = map[curveId];
      const report = ROCUtils.validateRocCurve(curve, curveId);
      results[curveId] = report;
    });
    return results;
  };

  ROCUtils.parseRocDataFromText = function(text, sourceName){
    const trimmed = sourceName ? String(sourceName).split(/[\\\/]/).pop() : null;
    const base = trimmed ? trimmed.replace(/\.[^.]+$/, '') : null;
    const options = base ? { defaultCurveName: base } : {};

    let raw;
    try {
      raw = JSON.parse(text);
    } catch (err) {
      throw new Error("Invalid JSON");
    }

    const canonical = ROCUtils.normalizeRocJson(raw, options);
    return { data: canonical, sourceType: 'json' };
  };

  globalScope.ROCUtils = ROCUtils;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
