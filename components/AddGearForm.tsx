import React, { useState } from 'react';
import { GearItem, GearCategory, Region } from '../types';
import { Plus } from 'lucide-react';

interface AddGearFormProps {
  onAdd: (item: GearItem) => void;
}

const CATEGORIES: GearCategory[] = ['Tent', 'Stove', 'Pack', 'Headlamp', 'Harness', 'Rope', 'PLB', 'Boots', 'Helmet', 'Carabiner', 'Other'];

const AddGearForm: React.FC<AddGearFormProps> = ({ onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState<GearCategory>('Other');
  const [year, setYear] = useState('');
  const [region, setRegion] = useState<Region>('US');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: GearItem = {
      id: crypto.randomUUID(),
      name: `${brand} ${model}`,
      brand,
      model,
      category,
      purchaseDate: year,
      region,
      status: 'unknown',
    };
    onAdd(newItem);
    setBrand('');
    setModel('');
    setYear('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <Plus className="w-5 h-5" /> Add New Gear
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 mb-6 animate-fade-in">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Add To Inventory</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Brand</label>
            <input 
              required
              type="text" 
              value={brand} 
              onChange={e => setBrand(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="e.g. Petzl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Model</label>
            <input 
              required
              type="text" 
              value={model} 
              onChange={e => setModel(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="e.g. Grigri+"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Category</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value as GearCategory)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Year</label>
            <input 
              required
              type="text" 
              value={year} 
              onChange={e => setYear(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="YYYY"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
             <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Region</label>
            <select 
              value={region} 
              onChange={e => setRegion(e.target.value as Region)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="US">USA (US)</option>
              <option value="EU">Europe (EU)</option>
              <option value="AU">Australia (AU)</option>
              <option value="Global">Global</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button 
            type="button" 
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm"
          >
            Save Item
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddGearForm;
