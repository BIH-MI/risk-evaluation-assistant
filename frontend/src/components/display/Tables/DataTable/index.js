import {
  Autocomplete,
  Icon,
  Table,
  TableBody,
  TableContainer,
  TableRow,
} from "@mui/material";
import { useMaterialUIController } from "context";
import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import {
  useAsyncDebounce,
  useFilters,
  usePagination,
  useSortBy,
  useTable,
} from "react-table";
import { FloatingAddButton } from "../../../input/RAButton/FixStyledButtons";
import RAInput from "../../../input/RAInput";
import RABox from "../../../layout/RABox";
import RAPagination from "../../../navigation/RAPagination";
import DataTableBodyCell from "./DataTableBodyCell";
import DataTableHeadCell from "./DataTableHeadCell";


function DataTable({
                     entriesPerPage,
                     canSearch,
                     canAdd,
                     showTotalEntries,
                     table,
                     pagination,
                     isSorted=false,
                     noEndBorder,
                     searchColumnKey = "",
                     searchPlaceholder = "",
                     onAddClick,
                     rowProps,
                     showAllEntries = false,
                   }) {

  const [controller] = useMaterialUIController();
  const { sidenavColor } = controller;

  const entriesPerPageConfig = entriesPerPage || {};
  const defaultValue = entriesPerPageConfig.defaultValue || 10;
  const entries = entriesPerPageConfig.entries
    ? entriesPerPageConfig.entries.map((el) => el.toString())
    : ["10", "15", "20", "25"];

  const columns = useMemo(() => table.columns, [table.columns]);
  const data = useMemo(() => table.rows, [table.rows]);

  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0 },
      autoResetPage: false,
      autoResetSortBy: false,
      autoResetFilters: false,
    },
    useFilters,
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows,
    page,
    pageOptions,
    canPreviousPage,
    canNextPage,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    setFilter,
    state: { pageIndex, pageSize },
  } = tableInstance;

  useEffect(() => setPageSize(defaultValue), [defaultValue, setPageSize]);

  const setEntriesPerPage = (value) => setPageSize(value);

  const [search, setSearch] = useState("");
  const onSearchChange = useAsyncDebounce((value) => {
    if (searchColumnKey) {
      setFilter(searchColumnKey, value || undefined);
    }
  }, 100);

  const setSortedValue = (column) => {
    if (!isSorted) return false;
    if (column.isSorted) return column.isSortedDesc ? "desc" : "asc";
    return "none";
  };

  const renderPagination = pageOptions.map((option) => (
    <RAPagination
      item
      key={option}
      onClick={() => gotoPage(option)}
      active={pageIndex === option}
    >
      {option + 1}
    </RAPagination>
  ));

  const customizedPageOptions = pageOptions.map((opt) => opt + 1);

  // Determine if the search bar is visible
  const isSearchVisible = canSearch && searchColumnKey;

  const rowsToRender = showAllEntries ? rows : page;

  return (
    <TableContainer>
      {/* Header: Search and Add Button */}
      <RABox
        display="flex"
        justifyContent={isSearchVisible ? "space-between" : "flex-end"}
        alignItems="center"
      >
        {/* Left: Search input */}
        {isSearchVisible && (
          <RABox width="12rem" px={2} py={2}>
            <RAInput
              placeholder={`Search ${searchPlaceholder}`}
              value={search}
              size="small"
              fullWidth
              onChange={({ currentTarget }) => {
                setSearch(currentTarget.value);
                onSearchChange(currentTarget.value);
              }}
            />
          </RABox>
        )}

        {/* Top Right Button: Always visible here if canAdd is true */}
        {canAdd && (
          <RABox px={2} py={2}>
            <FloatingAddButton onClick={onAddClick} />
          </RABox>
        )}
      </RABox>

      {/* Table Head */}
      <Table {...getTableProps()}>
        <RABox component="thead">
          {headerGroups.map((hg, i) => (
            <TableRow key={i} {...hg.getHeaderGroupProps()}>
              {hg.headers.map((col, j) => (
                <DataTableHeadCell
                  key={j}
                  {...col.getHeaderProps(
                    isSorted && col.getSortByToggleProps()
                  )}
                  py={2}
                  width={col.width || "auto"}
                  align={col.align || "center"}
                  sorted={setSortedValue(col)}
                >
                  {col.render("Header")}
                </DataTableHeadCell>
              ))}
            </TableRow>
          ))}
        </RABox>

        {/* Table body */}
        <TableBody {...getTableBodyProps()}>
          {rowsToRender.map((row, i) => {
            prepareRow(row);
            const extraRowProps = typeof rowProps === "function" ? rowProps(row) : {};
            const combinedRowProps = row.getRowProps(extraRowProps);

            return (
              <TableRow key={i} {...combinedRowProps}>
                {row.cells.map((cell, k) => (
                  <DataTableBodyCell
                    key={k}
                    noBorder={noEndBorder && rowsToRender.length - 1 === i}
                    align={cell.column.align || "left"}
                    {...cell.getCellProps()}
                  >
                    {cell.render("Cell")}
                  </DataTableBodyCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Table footer - Hidden if showAllEntries is active */}
      {!showAllEntries && (
        <RABox
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          justifyContent={{ xs: "flex-start", sm: "space-between" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          p={!showTotalEntries && pageOptions.length === 1 ? 0 : 3}
        >
          {entriesPerPage && (
            <RABox display="flex" alignItems="center" mb={{ xs: 2, sm: 0 }}>
              <Autocomplete
                disableClearable
                value={pageSize.toString()}
                options={entries}
                onChange={(e, val) => setEntriesPerPage(parseInt(val, 10))}
                size="small"
                sx={{ width: "5rem" }}
                renderInput={(params) => <RAInput {...params} />}
              />
            </RABox>
          )}

          {pageOptions.length > 1 && (
            <RABox>
              <RAPagination
                variant={pagination.variant || "gradient"}
                color={sidenavColor}
              >
                {canPreviousPage && (
                  <RAPagination item onClick={previousPage}>
                    <Icon sx={{ fontWeight: "bold" }}>chevron_left</Icon>
                  </RAPagination>
                )}
                {renderPagination.length > 6 ? (
                  <RABox width="5rem" mx={1}>
                    <RAInput
                      inputProps={{
                        type: "number",
                        min: 1,
                        max: customizedPageOptions.length,
                      }}
                      value={customizedPageOptions[pageIndex]}
                      onChange={(e) => gotoPage(Number(e.target.value - 1))}
                    />
                  </RABox>
                ) : (
                  renderPagination
                )}
                {canNextPage && (
                  <RAPagination item onClick={nextPage}>
                    <Icon sx={{ fontWeight: "bold" }}>chevron_right</Icon>
                  </RAPagination>
                )}
              </RAPagination>
            </RABox>
          )}
        </RABox>
      )}
    </TableContainer>
  );
}

// Setting default values for the props of DataTable
DataTable.defaultProps = {
  entriesPerPage: { defaultValue: 10, entries: [10, 15, 20, 25] },
  canSearch: false,
  canAdd: false,
  showTotalEntries: true,
  pagination: { variant: "gradient", color: "info" },
  isSorted: true,
  noEndBorder: false,
  onAddClick: () => {},
  rowProps: undefined,
  showAllEntries: false,
};

// Typechecking props for the DataTable
DataTable.propTypes = {
  entriesPerPage: PropTypes.oneOfType([
    PropTypes.shape({
      defaultValue: PropTypes.number,
      entries: PropTypes.arrayOf(PropTypes.number),
    }),
    PropTypes.bool,
  ]),
  canSearch: PropTypes.bool,
  canAdd: PropTypes.bool,
  showTotalEntries: PropTypes.bool,
  table: PropTypes.objectOf(PropTypes.array).isRequired,
  pagination: PropTypes.shape({
    variant: PropTypes.oneOf(["contained", "gradient"]),
    color: PropTypes.oneOf([
      "primary",
      "secondary",
      "info",
      "success",
      "warning",
      "error",
      "dark",
      "light",
    ]),
  }),
  isSorted: PropTypes.bool,
  noEndBorder: PropTypes.bool,
  onAddClick: PropTypes.func,
  rowProps: PropTypes.func,
  showAllEntries: PropTypes.bool,
};

export default DataTable;
