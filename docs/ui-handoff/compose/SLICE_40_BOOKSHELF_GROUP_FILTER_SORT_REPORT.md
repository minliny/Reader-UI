# Slice 40 Bookshelf Group Filter Sort Report

## 1. 总体结论

SLICE_40_BOOKSHELF_GROUP_FILTER_SORT_READY

## 2. 修改范围

| 文件 | 说明 |
|------|------|
| `bookshelf/BookshelfGroupFilterSort.kt` (new) | Group/filter/sort pure functions |
| `test/.../BookshelfGroupFilterSortTest.kt` (new) | 8 tests |

## 3. 功能

5 groups (ALL/READING/UNREAD/LOCAL/NETWORK), 4 sort modes (RECENT/TITLE/AUTHOR/PROGRESS). filter() + sort() + apply().

## 4. 测试结果

全部通过 (~860 tests)。P0/P1=0。下一 Slice: 41。
