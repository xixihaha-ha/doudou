// Keep protocol/settings values in English; translate only their display labels.
const labels: Record<string, string> = {
  General: '常规', Display: '显示', Hotkeys: '快捷键', 'API Keys': 'API 密钥',
  Auto: '自动', Standard: '通用', Coding: '编程', Systems: '系统设计', Behavioral: '行为面试',
  'Standard assistant': '通用助手', 'Coding interview': '编程面试',
  'System design': '系统设计', 'Behavioral (Soft skills)': '行为面试（软技能）',
  All: '全部', 'Core CS & OOPS': '计算机基础与面向对象', 'DSA & Algorithms': '数据结构与算法',
  'System Design': '系统设计', 'Behavioral (STAR)': '行为面试（STAR）',
};

export function zhLabel(value: string): string {
  return labels[value] ?? value;
}
