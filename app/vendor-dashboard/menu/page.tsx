"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { Plus, Trash2, Edit, Check, X, ToggleLeft, ToggleRight, List, AlertCircle, ShoppingBag } from "lucide-react";
import VendorSidebar from "@/components/VendorSidebar";

export default function VendorMenuPage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"ITEMS" | "CATEGORIES">("ITEMS");
  const [error, setError] = useState("");

  // Category forms state
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatDesc, setEditCatDesc] = useState("");

  // MenuItem modal form state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemIsVeg, setItemIsVeg] = useState(false);
  const [itemStockQty, setItemStockQty] = useState("-1");
  const [itemPrepTime, setItemPrepTime] = useState("15");

  const fetchData = async () => {
    try {
      const [catsRes, menuRes] = await Promise.all([
        api.get("/api/vendor/categories"),
        api.get("/api/vendor/menu"),
      ]);
      setCategories(catsRes.data?.data || []);
      setMenuItems(menuRes.data?.data || []);
    } catch (e) {
      console.error("Error fetching menu details:", e);
      setError("Failed to fetch menu data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    fetchData();
  }, [isAuthenticated, router]);

  // CATEGORY OPERATIONS
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.post("/api/vendor/categories", { name: newCatName, description: newCatDesc });
      setNewCatName("");
      setNewCatDesc("");
      await fetchData();
    } catch (e: any) {
      setError(e.response?.data?.message || "Error creating category.");
    }
  };

  const handleUpdateCategory = async (id: number) => {
    try {
      await api.patch(`/api/vendor/categories/${id}`, { name: editCatName, description: editCatDesc });
      setEditingCatId(null);
      await fetchData();
    } catch (e: any) {
      setError(e.response?.data?.message || "Error updating category.");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Delete this category? Items in it will lose their category association.")) return;
    try {
      await api.delete(`/api/vendor/categories/${id}`);
      await fetchData();
    } catch (e: any) {
      setError(e.response?.data?.message || "Error deleting category.");
    }
  };

  // MENU ITEM OPERATIONS
  const handleOpenAddModal = () => {
    setEditingItemId(null);
    setItemName("");
    setItemDesc("");
    setItemPrice("");
    setItemCategoryId(categories.length > 0 ? String(categories[0].id) : "");
    setItemIsVeg(false);
    setItemStockQty("-1");
    setItemPrepTime("15");
    setShowItemModal(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItemId(item.id);
    setItemName(item.name || "");
    setItemDesc(item.description || "");
    setItemPrice(String(parseFloat(item.price || 0).toFixed(0)));
    setItemCategoryId(String(item.categoryId || ""));
    setItemIsVeg(item.isVeg || false);
    setItemStockQty(String(item.stockQuantity ?? -1));
    setItemPrepTime(String(item.preparationTime ?? 15));
    setShowItemModal(true);
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const payload = {
      name: itemName,
      description: itemDesc,
      price: parseFloat(itemPrice),
      categoryId: parseInt(itemCategoryId),
      isVeg: itemIsVeg,
      stockQuantity: parseInt(itemStockQty),
      preparationTime: parseInt(itemPrepTime),
    };

    try {
      if (editingItemId) {
        await api.patch(`/api/vendor/menu/${editingItemId}`, payload);
      } else {
        await api.post("/api/vendor/menu", payload);
      }
      setShowItemModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save item.");
    }
  };

  const handleDeleteMenuItem = async (id: number) => {
    if (!confirm("Delete this menu item?")) return;
    try {
      await api.delete(`/api/vendor/menu/${id}`);
      await fetchData();
    } catch (e: any) {
      setError(e.response?.data?.message || "Could not delete menu item.");
    }
  };

  const handleToggleAvailability = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "OUT_OF_STOCK" : "ACTIVE";
    try {
      await api.patch(`/api/vendor/menu/${id}/availability`, { status: nextStatus });
      await fetchData();
    } catch (e: any) {
      setError(e.response?.data?.message || "Could not toggle availability.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm">
      <VendorSidebar />

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900">Menu management</h2>
          <div className="flex items-center gap-4">
            <button onClick={handleOpenAddModal} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Add MenuItem
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Toggle Views */}
          <div className="flex gap-4 border-b border-gray-100 pb-4">
            <button
              onClick={() => setActiveView("ITEMS")}
              className={`px-4 py-2 rounded-lg font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all ${
                activeView === "ITEMS" ? "bg-red-50 text-red-600" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <ShoppingBag className="w-4 h-4" /> Menu Items
            </button>
            <button
              onClick={() => setActiveView("CATEGORIES")}
              className={`px-4 py-2 rounded-lg font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all ${
                activeView === "CATEGORIES" ? "bg-red-50 text-red-600" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <List className="w-4 h-4" /> Categories
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
            </div>
          ) : activeView === "ITEMS" ? (
            /* MENU ITEMS VIEW */
            menuItems.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3" />
                <p className="font-bold text-gray-600 text-base">No Menu items yet</p>
                <p className="text-xs text-gray-400 mt-1 mb-6">Start building your restaurant menu profile.</p>
                <button onClick={handleOpenAddModal} className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md">Add Item</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map(item => {
                  const cat = categories.find(c => c.id === item.categoryId);
                  return (
                    <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                      {/* Veg Badge */}
                      <span className={`absolute top-4 right-4 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        item.isVeg ? 'border-green-300 text-green-700 bg-green-50' : 'border-red-300 text-red-700 bg-red-50'
                      }`}>
                        {item.isVeg ? "🟢 VEG" : "🔴 NON-VEG"}
                      </span>

                      <div>
                        <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded uppercase">
                          {cat?.name || "Uncategorized"}
                        </span>
                        <h4 className="font-bold text-gray-900 text-base mt-2.5">{item.name}</h4>
                        {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>}
                        
                        <div className="flex gap-4 mt-4 text-[11px] text-gray-400 font-medium border-t border-gray-50 pt-3">
                          <span>Prep: <span className="text-gray-950 font-bold">{item.preparationTime ?? 15}m</span></span>
                          <span>Stock: <span className="text-gray-950 font-bold">{item.stockQuantity === -1 ? "∞" : item.stockQuantity}</span></span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-6 border-t border-gray-100 pt-4">
                        <span className="font-extrabold text-gray-900 text-lg">₹{parseFloat(item.price).toFixed(0)}</span>
                        
                        <div className="flex items-center gap-2">
                          {/* Toggle Availability */}
                          <button
                            onClick={() => handleToggleAvailability(item.id, item.status)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50"
                            title="Toggle Availability"
                          >
                            {item.status === "ACTIVE" ? (
                              <ToggleRight className="w-6 h-6 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-gray-400" />
                            )}
                          </button>
                          {/* Edit button */}
                          <button onClick={() => handleOpenEditModal(item)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50">
                            <Edit className="w-4 h-4" />
                          </button>
                          {/* Delete button */}
                          <button onClick={() => handleDeleteMenuItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* CATEGORIES VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Category creation form */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5"><Plus className="w-5 h-5 text-red-600" /> Add Category</h3>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chicken"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description (Optional)</label>
                    <textarea
                      placeholder="Category description..."
                      rows={3}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none resize-none"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                    ></textarea>
                  </div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-xs shadow-sm transition-colors">
                    Add Category
                  </button>
                </form>
              </div>

              {/* Categories list */}
              <div className="lg:col-span-2 space-y-3">
                {categories.length === 0 ? (
                  <p className="text-gray-400 py-6 text-center">No categories defined yet.</p>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
                      {editingCatId === cat.id ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            className="bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className="bg-white border border-gray-200 rounded px-2 py-1 text-xs flex-1"
                              value={editCatDesc}
                              onChange={(e) => setEditCatDesc(e.target.value)}
                            />
                            <button onClick={() => handleUpdateCategory(cat.id)} className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingCatId(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-1.5 rounded"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <h4 className="font-bold text-gray-900">{cat.name}</h4>
                            {cat.description && <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name || ""); setEditCatDesc(cat.description || ""); }} className="text-gray-400 hover:text-red-600 p-1.5 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MENU ITEM ADD/EDIT MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="font-extrabold text-lg text-gray-900">{editingItemId ? "Edit Menu Item" : "Add Menu Item"}</h3>
              <button onClick={() => setShowItemModal(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. Mutton Chop"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                  <select
                    required
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none font-medium"
                    value={itemCategoryId}
                    onChange={(e) => setItemCategoryId(e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Describe your dish..."
                  rows={2}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none resize-none"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock (-1 = Unlimited)</label>
                  <input
                    type="number"
                    required
                    min={-1}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                    value={itemStockQty}
                    onChange={(e) => setItemStockQty(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prep Time (mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                    value={itemPrepTime}
                    onChange={(e) => setItemPrepTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <input
                  type="checkbox"
                  id="veg_checkbox"
                  className="w-4 h-4 text-red-600 border-gray-300 rounded"
                  checked={itemIsVeg}
                  onChange={(e) => setItemIsVeg(e.target.checked)}
                />
                <label htmlFor="veg_checkbox" className="font-bold text-gray-700 text-xs cursor-pointer">This item is Vegetarian (VEG)</label>
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors mt-6 text-xs uppercase tracking-wider">
                {editingItemId ? "Save changes" : "Create menu item"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
