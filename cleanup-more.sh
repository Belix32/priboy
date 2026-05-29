#!/bin/bash
# ============================================================
# cleanup-more.sh — Удаление модуля "Поездки на море" из проекта
# ============================================================
# Внимание: скрипт удаляет все файлы модуля "Поездки на море"
# из основного проекта /root/zaparkyi.
#
# Перед запуском убедитесь, что sea-module/ содержит полную копию.
#
# Запуск:
#   bash sea-module/cleanup-more.sh
#
# Для сухого прогона (без удаления):
#   bash sea-module/cleanup-more.sh --dry-run
# ============================================================

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== СУХОЙ ПРОГОН — ничего не удаляется ==="
fi

ROOT="/root/zaparkyi"

echo "=========================================="
echo " Очистка модуля 'Поездки на море'"
echo "=========================================="

# ===== 1. Удаление пользовательских страниц Travel =====
echo ""
echo "--- 1. Удаление src/pages/Travel/ ---"
if [ -d "$ROOT/src/pages/Travel" ]; then
  if $DRY_RUN; then
    echo "  [DRY] rm -rf $ROOT/src/pages/Travel"
  else
    rm -rf "$ROOT/src/pages/Travel"
    echo "  ✓ Удалено: src/pages/Travel/"
  fi
else
  echo "  — Папка не найдена, пропущено"
fi

# ===== 2. Удаление библиотеки travel =====
echo ""
echo "--- 2. Удаление src/lib/travel/ ---"
if [ -d "$ROOT/src/lib/travel" ]; then
  if $DRY_RUN; then
    echo "  [DRY] rm -rf $ROOT/src/lib/travel"
  else
    rm -rf "$ROOT/src/lib/travel"
    echo "  ✓ Удалено: src/lib/travel/"
  fi
else
  echo "  — Папка не найдена, пропущено"
fi

# ===== 3. Удаление Partner pages (все — морские) =====
echo ""
echo "--- 3. Удаление src/pages/Partner/ ---"
if [ -d "$ROOT/src/pages/Partner" ]; then
  if $DRY_RUN; then
    echo "  [DRY] rm -rf $ROOT/src/pages/Partner"
  else
    rm -rf "$ROOT/src/pages/Partner"
    echo "  ✓ Удалено: src/pages/Partner/"
  fi
else
  echo "  — Папка не найдена, пропущено"
fi

# ===== 4. Удаление Admin Travel файлов =====
echo ""
echo "--- 4. Удаление Admin Travel файлов ---"
for f in "$ROOT/src/pages/Admin/AdminTravelDashboard.tsx" \
         "$ROOT/src/pages/Admin/AdminTravelDestinations.tsx" \
         "$ROOT/src/pages/Admin/AdminTravelPartners.tsx" \
         "$ROOT/src/pages/Admin/AdminTravelCars.tsx" \
         "$ROOT/src/pages/Admin/AdminTravelBookings.tsx" \
         "$ROOT/src/pages/Admin/AdminTravelStorage.tsx" \
         "$ROOT/src/pages/Admin/AdminTravel.module.css" \
         "$ROOT/src/pages/Admin/components/TravelModal.tsx"; do
  if [ -f "$f" ]; then
    if $DRY_RUN; then
      echo "  [DRY] rm $f"
    else
      rm "$f"
      echo "  ✓ Удалён: $(basename $f)"
    fi
  else
    echo "  — Файл не найден: $(basename $f)"
  fi
done

# ===== 5. Удаление миграции БД =====
echo ""
echo "--- 5. Удаление supabase/migrations/004_travel_module.sql ---"
if [ -f "$ROOT/supabase/migrations/004_travel_module.sql" ]; then
  if $DRY_RUN; then
    echo "  [DRY] rm $ROOT/supabase/migrations/004_travel_module.sql"
  else
    rm "$ROOT/supabase/migrations/004_travel_module.sql"
    echo "  ✓ Удалён: 004_travel_module.sql"
  fi
else
  echo "  — Файл не найден, пропущено"
fi

# ===== 6. Удаление built-артефактов (dist/) =====
echo ""
echo "--- 6. Удаление скомпилированных артефактов в dist/ ---"
# Удаляем все Travel* и Partner* файлы в dist/assets
if $DRY_RUN; then
  echo "  [DRY] rm -f $ROOT/dist/assets/Travel* $ROOT/dist/assets/Partner*"
  echo "  [DRY] rm -f $ROOT/dist/assets/AdminTravel*"
else
  rm -f "$ROOT"/dist/assets/Travel*.{js,css} "$ROOT"/dist/assets/Partner*.{js,css}
  rm -f "$ROOT"/dist/assets/AdminTravel*.{js,css}
  echo "  ✓ Скомпилированные артефакты удалены"
fi

echo ""
echo "=== ДАЛЕЕ: ручная чистка файлов со смешанным содержимым ==="
echo ""
echo "Эти файлы содержат ссылки на море, но не являются исключительно"
echo "морскими — их нужно править вручную:"
echo ""
echo "  1. src/App.tsx"
echo "     - Удалить lazy-импорты Travel (строки 34-49)"
echo "     - Удалить Travel Routes (строки 117-132)"
echo "     - Удалить Partner lazy-импорты (строки 51-55)"
echo "     - Удалить Partner Routes (строки 134-138)"
echo ""
echo "  2. src/components/Header/Header.tsx"
echo "     - Удалить NavLink \"На море\" (строка 43)"
echo "     - Удалить mobile-nav \"Поездки на море\" (строки 109-111)"
echo ""
echo "  3. src/styles/variables.css"
echo "     - Удалить секцию /* Ocean/Sea theme — Light */ (строки 15-29)"
echo "     - Удалить секцию /* Ocean/Sea theme — Dark */ (строки 78-92)"
echo ""

if $DRY_RUN; then
  echo "=== СУХОЙ ПРОГОН ЗАВЕРШЁН — ничего не удалено ==="
else
  echo "=== ОЧИСТКА ЗАВЕРШЕНА ==="
fi
