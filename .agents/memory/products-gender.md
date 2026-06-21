---
name: Products Gender Field
description: How the gender/audience column works on products and how home tabs filter by it
---

# Products Gender Field

## The rule
Products have a `gender` column (`all` | `women` | `men`, default `all`). Home tabs WOMEN/MEN filter by it; BEAUTY/SALE still filter by `category`.

**Why:** Users wanted to separate women's vs men's products while keeping a shared catalog for unisex items.

**How to apply:**
- New products default to `gender='all'` — they show in every tab until explicitly set
- `GET /store/products?gender=women` → SQL: `(gender='women' OR gender='all')`
- `GET /store/products?gender=men` → SQL: `(gender='men' OR gender='all')`
- Admin product forms have an "Audience" selector (All / Women / Men) separate from Category
- The `gender` field is saved in both POST and PUT admin product endpoints

## FOR YOU tab
- Product detail page tracks views in AsyncStorage key `mora_views` (last 20: `{id, tags, gender}`)
- Home screen FOR YOU tab reads AsyncStorage → counts tag + gender frequency → fetches by top tag + gender
- Falls back to unfiltered products if no view history
- `GET /store/products?tag=x` → SQL: `AND tags LIKE '%"x"%'`
