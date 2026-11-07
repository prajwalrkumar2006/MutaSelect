/**
 * Universal Syntax-Aware RTL Mutation Engine
 * Generates mutations strictly based on actual constructs present in the uploaded design.
 * Covers all 5 standard operator groups:
 * A. Expression mutations (relational, arithmetic, bitwise, logical, equality)
 * B. Data mutations (constants, literals, bit-slice, assignments)
 * C. Sequential logic mutations (reset values, reset conditions, clock edges, register updates)
 * D. Control logic mutations (FSM transitions, case branch pruning, branch swaps, condition inversions)
 * E. Protocol & handshake mutations (ready/valid handshakes, enable conditions)
 */

import { Mutant, OperatorCategory, OperatorGroup } from '../types';

interface MutationPlugin {
  group: OperatorGroup;
  category: OperatorCategory;
  description: string;
  appliesTo: (line: string, context: { file: string; lineNum: number; inAlways: boolean; inCase: boolean }) => boolean;
  mutate: (line: string, context: { file: string; lineNum: number }) => { mutated: string; description: string }[];
}

const PLUGINS: MutationPlugin[] = [
  // --- A. Expression Mutations ---
  {
    group: 'expression',
    category: 'relational',
    description: 'Relational operator replacement (==, !=, <, >, <=, >=)',
    appliesTo: (line) => /(==|!=|<=|>=|<|>)/.test(line) && !line.trim().startsWith('//'),
    mutate: (line) => {
      const results: { mutated: string; description: string }[] = [];
      if (line.includes('==')) results.push({ mutated: line.replace('==', '!='), description: 'Inverted equality comparator (== -> !=)' });
      else if (line.includes('!=')) results.push({ mutated: line.replace('!=', '=='), description: 'Inverted inequality comparator (!= -> ==)' });
      else if (line.includes('<=')) results.push({ mutated: line.replace('<=', '<'), description: 'Strict inequality bound (<= -> <)' });
      else if (line.includes('>=')) results.push({ mutated: line.replace('>=', '>'), description: 'Strict inequality bound (>= -> >)' });
      else if (line.includes('<') && !line.includes('<=') && !line.includes('<<')) results.push({ mutated: line.replace('<', '<='), description: 'Weakened inequality bound (< -> <=)' });
      else if (line.includes('>') && !line.includes('>=') && !line.includes('>>')) results.push({ mutated: line.replace('>', '>='), description: 'Weakened inequality bound (> -> >=)' });
      return results;
    }
  },
  {
    group: 'expression',
    category: 'arithmetic',
    description: 'Arithmetic operator swap (+ <-> -)',
    appliesTo: (line) => /(?<![+\-\w])\+(?![+\-\w=])|(?<![+\-\w])\-(?![+\-\w=>])/.test(line),
    mutate: (line) => {
      const results: { mutated: string; description: string }[] = [];
      if (line.includes('+') && !line.includes('++')) results.push({ mutated: line.replace('+', '-'), description: 'Inverted adder to subtractor (+ -> -)' });
      else if (line.includes('-') && !line.includes('--') && !line.includes('->')) results.push({ mutated: line.replace('-', '+'), description: 'Inverted subtractor to adder (- -> +)' });
      return results;
    }
  },
  {
    group: 'expression',
    category: 'bitwise',
    description: 'Bitwise operator swap (&, |, ^)',
    appliesTo: (line) => {
      const clean = line.replace('&&', '').replace('||', '');
      return /[&|^]/.test(clean);
    },
    mutate: (line) => {
      const results: { mutated: string; description: string }[] = [];
      if (line.includes('&') && !line.includes('&&')) results.push({ mutated: line.replace('&', '|'), description: 'Bitwise AND replaced with OR (& -> |)' });
      else if (line.includes('|') && !line.includes('||')) results.push({ mutated: line.replace('|', '&'), description: 'Bitwise OR replaced with AND (| -> &)' });
      else if (line.includes('^')) results.push({ mutated: line.replace('^', '&'), description: 'Bitwise XOR replaced with AND (^ -> &)' });
      return results;
    }
  },
  {
    group: 'expression',
    category: 'logical',
    description: 'Logical gate swap (&& <-> ||)',
    appliesTo: (line) => line.includes('&&') || line.includes('||'),
    mutate: (line) => {
      const results: { mutated: string; description: string }[] = [];
      if (line.includes('&&')) results.push({ mutated: line.replace('&&', '||'), description: 'Logical AND swapped to OR (&& -> ||)' });
      else if (line.includes('||')) results.push({ mutated: line.replace('||', '&&'), description: 'Logical OR swapped to AND (|| -> &&)' });
      return results;
    }
  },

  // --- B. Data Mutations ---
  {
    group: 'data',
    category: 'constant_boundary',
    description: 'Boundary constant off-by-one (±1)',
    appliesTo: (line) => /\b(\d+)\b/.test(line) && !line.trim().startsWith('//') && !line.includes('`timescale'),
    mutate: (line) => {
      const match = line.match(/\b(\d+)\b/);
      if (!match) return [];
      const val = parseInt(match[1], 10);
      return [
        { mutated: line.replace(match[1], String(val + 1)), description: `Boundary constant incremented (${val} -> ${val + 1})` }
      ];
    }
  },
  {
    group: 'data',
    category: 'stuck_at',
    description: 'Stuck-at fault on signal assignment (stuck-at-0 / stuck-at-1)',
    appliesTo: (line) => (line.includes('<=') || line.includes('assign ')) && (line.includes("1'b0") || line.includes("1'b1")),
    mutate: (line) => {
      if (line.includes("1'b1")) return [{ mutated: line.replace("1'b1", "1'b0"), description: "Stuck-at-0 on asserted signal (1'b1 -> 1'b0)" }];
      if (line.includes("1'b0")) return [{ mutated: line.replace("1'b0", "1'b1"), description: "Stuck-at-1 on de-asserted signal (1'b0 -> 1'b1)" }];
      return [];
    }
  },

  // --- C. Sequential Logic Mutations ---
  {
    group: 'sequential',
    category: 'reset_value',
    description: 'Reset value corruption (e.g. 0 -> 1 or uninitialized)',
    appliesTo: (line) => /<=\s*\{?[a-zA-Z_0-9]*\{?1'b0/.test(line) || /<=\s*0\s*;/.test(line),
    mutate: (line) => {
      if (line.includes("1'b0")) {
        return [{ mutated: line.replace("1'b0", "1'b1"), description: 'Corrupted synchronous/asynchronous reset initialization value' }];
      }
      return [];
    }
  },
  {
    group: 'sequential',
    category: 'clock_edge_swap',
    description: 'Clock sensitivity edge inversion (posedge <-> negedge)',
    appliesTo: (line) => /@(posedge|negedge)\s+([a-zA-Z_0-9]+)/.test(line),
    mutate: (line) => {
      if (line.includes('posedge')) return [{ mutated: line.replace('posedge', 'negedge'), description: 'Clock edge inverted (posedge -> negedge)' }];
      if (line.includes('negedge')) return [{ mutated: line.replace('negedge', 'posedge'), description: 'Clock edge inverted (negedge -> posedge)' }];
      return [];
    }
  },

  // --- D. Control Logic Mutations ---
  {
    group: 'control',
    category: 'branch_swap',
    description: 'Conditional branch inversion (if cond -> if !cond)',
    appliesTo: (line) => /^\s*if\s*\((.+)\)/.test(line),
    mutate: (line) => {
      const match = line.match(/^(\s*if\s*\()(.+?)(\)\s*.*)$/);
      if (!match) return [];
      const cond = match[2].trim();
      const inverted = cond.startsWith('!') ? cond.slice(1).trim() : `!(${cond})`;
      return [{ mutated: `${match[1]}${inverted}${match[3]}`, description: 'Conditional branch condition inverted' }];
    }
  },
  {
    group: 'control',
    category: 'fsm_state_corrupt',
    description: 'FSM next-state corruption',
    appliesTo: (line) => /(?:next_state|state)\s*<=\s*([a-zA-Z_0-9]+)/.test(line),
    mutate: (line) => {
      const match = line.match(/((?:next_state|state)\s*<=\s*)([a-zA-Z_0-9]+)(.*)/);
      if (!match) return [];
      return [{ mutated: `${match[1]}0${match[3]} /* mutated state */`, description: 'FSM state transition destination corrupted to zero state' }];
    }
  },
  {
    group: 'control',
    category: 'case_item_removal',
    description: 'Case statement branch pruning',
    appliesTo: (line, ctx) => ctx.inCase && /^\s*[0-9a-zA-Z_']+\s*:\s*/.test(line) && !line.includes('default:'),
    mutate: (line) => {
      return [{ mutated: `// ${line.trim()} [case item pruned]`, description: 'Pruned active branch from case statement' }];
    }
  },

  // --- E. Protocol and Handshake Mutations ---
  {
    group: 'protocol',
    category: 'handshake_condition',
    description: 'Ready/valid handshake condition alteration',
    appliesTo: (line) => /(?:ready\s*&&\s*valid|valid\s*&&\s*ready|hready\s*&&\s*hsel)/i.test(line),
    mutate: (line) => {
      if (/ready\s*&&\s*valid/i.test(line)) {
        return [{ mutated: line.replace(/ready\s*&&\s*valid/i, 'valid'), description: 'Removed ready check from handshake (dropped backpressure)' }];
      }
      return [];
    }
  }
];

export function generateUniversalMutants(
  synthesizableFiles: { name: string; content: string }[],
  maxMutants: number = 50,
  seed: number = 42
): Mutant[] {
  const generated: Mutant[] = [];
  let mutantIdx = 1;

  for (const file of synthesizableFiles) {
    const lines = file.content.split('\n');
    let inCase = false;
    let inAlways = false;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const rawLine = lines[lineIdx];
      const lineNum = lineIdx + 1;
      const trimmed = rawLine.trim();

      // Track context
      if (/\bcase\s*\(/.test(trimmed)) inCase = true;
      if (/\bendcase\b/.test(trimmed)) inCase = false;
      if (/\balways\b|\balways_ff\b|\balways_comb\b/.test(trimmed)) inAlways = true;
      if (/\bend\b/.test(trimmed)) inAlways = false;

      // Skip comments, directives, declarations
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('`') || trimmed.startsWith('module') || trimmed.startsWith('endmodule')) {
        continue;
      }

      for (const plugin of PLUGINS) {
        if (plugin.appliesTo(rawLine, { file: file.name, lineNum, inAlways, inCase })) {
          const variants = plugin.mutate(rawLine, { file: file.name, lineNum });
          for (const v of variants) {
            if (v.mutated !== rawLine) {
              const id = `m${String(mutantIdx).padStart(3, '0')}`;
              mutantIdx++;

              const diff = `--- ${file.name}:${lineNum}\n+++ ${file.name}:${lineNum}\n@@ -${lineNum},1 +${lineNum},1 @@\n- ${rawLine.trim()}\n+ ${v.mutated.trim()}`;

              generated.push({
                id,
                file: file.name,
                line: lineNum,
                column: 1,
                group: plugin.group,
                category: plugin.category,
                operatorDescription: v.description,
                originalSnippet: rawLine.trim(),
                mutatedSnippet: v.mutated.trim(),
                diff,
                status: 'survived'
              });

              if (generated.length >= maxMutants * 2) break;
            }
          }
        }
      }
    }
  }

  // Shuffle and pick maxMutants with reproducible seed
  const shuffled = seededShuffle(generated, seed);
  return shuffled.slice(0, maxMutants);
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let m = result.length;
  let s = seed;
  while (m) {
    s = (s * 9301 + 49297) % 233280;
    const rnd = s / 233280.0;
    const i = Math.floor(rnd * m--);
    const t = result[m];
    result[m] = result[i];
    result[i] = t;
  }
  return result;
}
