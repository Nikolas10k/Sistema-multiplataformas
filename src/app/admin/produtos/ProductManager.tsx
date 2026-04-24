"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, X, Upload, Link as LinkIcon } from "lucide-react";
import { createProduct, updateProduct, deleteProduct } from "@/actions/admin-products";
import { uploadProductImage } from "@/actions/upload";
import { useRouter } from "next/navigation";

export default function ProductManager({ initialProducts, categories }: { initialProducts: any[], categories: any[] }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSource, setImageSource] = useState<"url" | "file">("url");
  const [previewUrl, setPreviewUrl] = useState("");
  const [active, setActive] = useState(true);

  const openModal = (product?: any) => {
    if (product) {
      setEditingId(product.id);
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price.toString());
      setCategoryId(product.category?.name || "");
      setImageUrl(product.imageUrl || "");
      setPreviewUrl(product.imageUrl || "");
      setImageSource("url");
      setActive(product.active);
    } else {
      setEditingId(null);
      setName("");
      setDescription("");
      setPrice("");
      setCategoryId(categories.length > 0 ? categories[0].name : "");
      setImageUrl("");
      setPreviewUrl("");
      setImageFile(null);
      setImageSource("url");
      setActive(true);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setImageFile(null);
    setPreviewUrl("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setImageSource("file");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let finalImageUrl = imageUrl;

    // Se houver arquivo novo, faz o upload primeiro
    if (imageSource === "file" && imageFile) {
      const formData = new FormData();
      formData.append("file", imageFile);
      const uploadRes = await uploadProductImage(formData);
      if (uploadRes.success) {
        finalImageUrl = uploadRes.url || "";
      } else {
        alert(uploadRes.message);
        setLoading(false);
        return;
      }
    }

    const data = {
      name,
      description,
      price: parseFloat(price) || 0,
      categoryName: categoryId,
      imageUrl: finalImageUrl,
      active
    };

    let res;
    if (editingId) {
      res = await updateProduct(editingId, data);
    } else {
      res = await createProduct(data);
    }

    setLoading(false);
    if (res.success) {
      closeModal();
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      const res = await deleteProduct(id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.message);
      }
    }
  };

  return (
    <>
      <div className="flex-between mb-4">
        <div>
          <h1 className="text-h2">Produtos</h1>
          <p className="text-muted text-sm mt-1">Gerencie o cardápio e estoque do restaurante.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={18} />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {initialProducts.map(p => (
                <tr key={p.id}>
                  <td className="font-medium flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: 'var(--bg-tertiary)' }} />
                    )}
                    {p.name}
                  </td>
                  <td className="text-muted text-sm" style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.description || "-"}
                  </td>
                  <td>{p.category.name}</td>
                  <td className="font-medium">R$ {p.price.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${p.active ? 'badge-success' : 'badge-danger'}`}>
                      {p.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    <div className="flex" style={{ gap: '0.5rem' }}>
                      <button className="btn-icon" title="Editar" onClick={() => openModal(p)}>
                        <Edit size={18} />
                      </button>
                      <button className="btn-icon text-danger" title="Excluir" onClick={() => handleDelete(p.id)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {initialProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay flex-center" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-fade-in" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between mb-6">
              <h2 className="text-h2">{editingId ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <input required type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} />
              </div>
              
              <div className="grid-2 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Preço (R$) *</label>
                  <input required type="number" step="0.01" className="input-field" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria *</label>
                  <input 
                    required 
                    type="text" 
                    className="input-field" 
                    list="category-options"
                    placeholder="Ex: Lanches, Bebidas..."
                    value={categoryId} 
                    onChange={e => setCategoryId(e.target.value)} 
                  />
                  <datalist id="category-options">
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </datalist>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea className="input-field" rows={3} value={description} onChange={e => setDescription(e.target.value)}></textarea>
              </div>

              {/* IMAGEM: Toggle entre URL e Arquivo */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Imagem do Produto</label>
                
                <div className="flex mb-3" style={{ gap: '0.5rem' }}>
                  <button 
                    type="button"
                    className={`btn btn-sm ${imageSource === 'url' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setImageSource('url')}
                    style={{ flex: 1 }}
                  >
                    <LinkIcon size={14} style={{ marginRight: '4px' }} /> URL Externa
                  </button>
                  <button 
                    type="button"
                    className={`btn btn-sm ${imageSource === 'file' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setImageSource('file')}
                    style={{ flex: 1 }}
                  >
                    <Upload size={14} style={{ marginRight: '4px' }} /> Enviar Arquivo
                  </button>
                </div>

                {imageSource === 'url' ? (
                  <input 
                    type="url" 
                    className="input-field" 
                    placeholder="https://images.unsplash.com/..." 
                    value={imageUrl} 
                    onChange={e => { setImageUrl(e.target.value); setPreviewUrl(e.target.value); }} 
                  />
                ) : (
                  <div className="file-upload-wrapper">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="hidden-file-input"
                      id="product-file"
                    />
                    <label htmlFor="product-file" className="file-upload-label">
                      <Upload size={24} className="mb-2 text-muted" />
                      <span className="text-sm">{imageFile ? imageFile.name : 'Clique para selecionar imagem'}</span>
                      <span className="text-xs text-muted mt-1">PNG, JPG ou WEBP (Máx 5MB)</span>
                    </label>
                  </div>
                )}

                {previewUrl && (
                  <div className="mt-3 relative">
                    <p className="text-xs text-muted mb-1">Pré-visualização:</p>
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                    <button 
                      type="button" 
                      className="btn-icon" 
                      style={{ position: 'absolute', top: '25px', right: '5px', backgroundColor: 'rgba(255,255,255,0.8)' }}
                      onClick={() => { setPreviewUrl(""); setImageUrl(""); setImageFile(null); }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-6 flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                <label htmlFor="active" className="text-sm font-medium cursor-pointer">Produto Ativo (Aparece no cardápio)</label>
              </div>

              <div className="flex-between" style={{ gap: '1rem' }}>
                <button type="button" className="btn btn-secondary flex-1" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .file-upload-wrapper {
          border: 2px dashed var(--border);
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .file-upload-wrapper:hover {
          border-color: var(--accent);
        }
        .hidden-file-input {
          display: none;
        }
        .file-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
