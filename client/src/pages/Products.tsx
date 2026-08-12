import React, { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Download, Search, Filter, SlidersHorizontal } from "lucide-react";

export default function Products() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialType = searchParams.get("type") || "all";
  const initialCategory = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined;

  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("default");

  const categoriesQuery = trpc.store.categories.useQuery();
  const productsQuery = trpc.store.products.useQuery({
    type: selectedType === "all" ? undefined : selectedType,
    categoryId: selectedCategory,
    search: searchQuery || undefined,
  });

  const categories = categoriesQuery.data || [];
  let products = productsQuery.data || [];

  // Sorting
  if (sortBy === "price-asc") {
    products = [...products].sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortBy === "price-desc") {
    products = [...products].sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortBy === "name") {
    products = [...products].sort((a, b) => a.name.localeCompare(b.name));
  }

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val));
  };

  return (
    <StoreLayout>
      <div className="bg-slate-900/40 border-b border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black text-white">Khám Phá Cửa Hàng DHL Stores</h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Tìm kiếm áo đấu bóng đá thiết kế đẳng cấp và các sản phẩm file số / font chữ chuyên nghiệp cho dự án của bạn.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters & Search Toolbar */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-6 rounded-2xl mb-10 space-y-4 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Tìm kiếm áo đấu, file in 4K, font số..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl"
              />
            </div>

            {/* Type Filter Tabs */}
            <div className="md:col-span-4 flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setSelectedType("all")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${selectedType === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSelectedType("physical")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${selectedType === 'physical' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Vật lý (Áo đấu)
              </button>
              <button
                onClick={() => setSelectedType("digital")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${selectedType === 'digital' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Sản phẩm số
              </button>
            </div>

            {/* Sorting */}
            <div className="md:col-span-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-200 rounded-xl">
                  <SelectValue placeholder="Sắp xếp theo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="default">Mặc định</SelectItem>
                  <SelectItem value="price-asc">Giá: Thấp đến Cao</SelectItem>
                  <SelectItem value="price-desc">Giá: Cao đến Thấp</SelectItem>
                  <SelectItem value="name">Tên sản phẩm (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Categories Filter pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 font-semibold mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-400" /> Danh mục:
            </span>
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCategory === undefined ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}`}
            >
              Tất cả danh mục
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCategory === c.id ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {products.length === 0 ? (
          <div className="text-center py-24 bg-slate-900/40 rounded-3xl border border-slate-800">
            <Package className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-bold text-white">Không tìm thấy sản phẩm phù hợp</h3>
            <p className="text-xs text-slate-400 mt-1">Vui lòng thử lại với từ khóa hoặc bộ lọc khác.</p>
            <Button
              onClick={() => { setSelectedType("all"); setSelectedCategory(undefined); setSearchQuery(""); }}
              className="mt-6 bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Xóa bộ lọc
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(p => (
              <Link key={p.id} href={`/product/${p.slug}`} className="group">
                <div className="bg-slate-900/80 rounded-2xl overflow-hidden border border-slate-800 group-hover:border-amber-500/50 transition-all duration-300 flex flex-col h-full shadow-lg">
                  <div className="relative aspect-square overflow-hidden bg-slate-950">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className={p.type === 'physical' ? 'bg-blue-600 text-white font-semibold' : 'bg-purple-600 text-white font-semibold'}>
                        {p.type === 'physical' ? 'Sản phẩm vật lý' : 'Sản phẩm số'}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                        {p.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className="text-base font-black text-amber-400">
                        {formatCurrency(p.price)}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                        Xem chi tiết
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
