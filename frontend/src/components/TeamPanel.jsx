import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Typography } from '@mui/material';
import './TeamPanel.css';

const TeamPanel = ({ teamData, onPlayerSelect, selectedPlayerId, selectedTeam, teamIdentifier }) => {
  if (!teamData || !teamData.players) {
    return <div className="team-panel">Loading...</div>;
  }

  // Calculate team totals
  const teamTotals = {
    id: 'team-total',
    number: 'TOT',
    minutes: teamData.players.reduce((total, player) => {
      return total + (player.minutes * 60 + player.seconds);
    }, 0),
    points: teamData.players.reduce((total, player) => total + (player.points || 0), 0),
    rebounds: teamData.players.reduce((total, player) => total + (player.total_rebounds || 0), 0),
    assists: teamData.players.reduce((total, player) => total + (player.assists || 0), 0),
    fgm: teamData.players.reduce((total, player) => total + (player.fg_made || 0), 0),
    fga: teamData.players.reduce((total, player) => total + (player.fg_attempted || 0), 0),
    fouls: teamData.players.reduce((total, player) => total + (player.fouls || 0), 0),
    plusMinus: teamData.players.reduce((total, player) => total + (player.plusminus || 0), 0),
    isTotal: true  // Special flag for styling
  };

  // Calculate derived fields for team totals
  teamTotals.fg = `${teamTotals.fgm}/${teamTotals.fga}`;
  teamTotals.fgPct = teamTotals.fga > 0 ? ((teamTotals.fgm / teamTotals.fga) * 100).toFixed(1) : '0.0';
  // Convert total seconds to MM:SS format
  const totalMinutes = Math.floor(teamTotals.minutes / 60);
  const totalSeconds = teamTotals.minutes % 60;
  teamTotals.minutes = `${totalMinutes}:${String(totalSeconds).padStart(2, '0')}`;
  teamTotals.minutesSort = 999999; // Ensure it sorts to the top

  // Filter out players with 0 minutes and format data for DataGrid
  const playerRows = teamData.players
    .filter(player => player.minutes > 0 || player.seconds > 0)
    .map(player => ({
      id: player.person_id,
      name: `${player.first_name} ${player.last_name}`,
      number: player.jersey_number,
      minutes: `${player.minutes}:${String(player.seconds).padStart(2, '0')}`,
      points: player.points || 0,
      rebounds: player.total_rebounds || 0,
      assists: player.assists || 0,
      fgm: player.fg_made || 0,
      fga: player.fg_attempted || 0,
      fgPct: (player.fg_pct || 0).toFixed(1),
      fouls: player.fouls || 0,
      plusMinus: player.plusminus || 0,
      minutesSort: (player.minutes * 60 + player.seconds) || 0,
      isOnCourt: player.oncourt,
      // Add combined field for FG
      fg: `${player.fg_made || 0}/${player.fg_attempted || 0}`
    }))
    .filter(row => row !== null);

  const rows = [teamTotals, ...playerRows];

  // Define column widths as percentages of total width
  const columns = [
    {
      field: 'number',
      headerName: '#',
      flex: 0.4,
      minWidth: 30,
      renderCell: (params) => (
        <Box sx={{
          fontWeight: params.row.isTotal ? 'bold' : 'bold',
          color: params.row.isTotal ? '#000' : (params.row.isOnCourt ? '#1976d2' : 'inherit'),
          textAlign: 'center',
          width: '100%',
          backgroundColor: params.row.isTotal ? '#f5f5f5' : 'transparent',
        }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'minutes',
      headerName: 'MIN',
      flex: 0.6,
      minWidth: 45,
      sortComparator: (v1, v2, param1, param2) => {
        if (!param1?.row?.minutesSort || !param2?.row?.minutesSort) {
          return 0;
        }
        return param1.row.minutesSort - param2.row.minutesSort;
      }
    },
    {
      field: 'points',
      headerName: 'PTS',
      flex: 0.4,
      minWidth: 35,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'rebounds',
      headerName: 'REB',
      flex: 0.4,
      minWidth: 35,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'assists',
      headerName: 'AST',
      flex: 0.4,
      minWidth: 35,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'fg',
      headerName: 'FG',
      flex: 0.5,
      minWidth: 45,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'fgPct',
      headerName: 'FG%',
      flex: 0.5,
      minWidth: 45,
      align: 'center',
      headerAlign: 'center',
      valueFormatter: (params) => `${params.value}%`,
    },
    {
      field: 'fouls',
      headerName: 'PF',
      flex: 0.3,
      minWidth: 30,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'plusMinus',
      headerName: '+/-',
      flex: 0.4,
      minWidth: 35,
      align: 'center',
      headerAlign: 'center',
    },
  ];

  return (
    <div className="team-panel">
      <Typography variant="h6" sx={{
        p: 0.5,
        bgcolor: '#f5f5f5',
        fontSize: '0.9rem',
        fontWeight: 'bold'
      }}>
        {teamData.team_name}
      </Typography>
      <Box sx={{
        flexGrow: 1,
        width: '100%',
        overflow: 'hidden',
        '& .MuiDataGrid-root': {
          border: 'none',
          fontSize: '0.8rem',
          WebkitFontSmoothing: 'auto',
          letterSpacing: 'normal',
          width: '100%',
          overflow: 'hidden !important',
          '& .MuiDataGrid-main': {
            overflow: 'hidden !important',
          },
          '& .MuiDataGrid-columnHeaders': {
            borderBottom: '1px solid #ddd',
            minHeight: '30px !important',
            maxHeight: '30px !important',
            lineHeight: '30px',
            backgroundColor: '#f5f5f5',
            color: '#666',
            fontWeight: 'bold',
          },
          '& .MuiDataGrid-virtualScroller': {
            marginTop: '30px !important',
            overflowX: 'hidden !important',
          },
          '& .MuiDataGrid-columnsContainer': {
            backgroundColor: '#f5f5f5',
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #f0f0f0',
            padding: '0 4px',
            whiteSpace: 'nowrap',
          },
          '& .MuiDataGrid-row': {
            minHeight: '25px !important',
            maxHeight: '25px !important',
            '&.Mui-selected': {
              backgroundColor: '#e3f2fd !important',
              '&:hover': {
                backgroundColor: '#e3f2fd !important',
              },
            },
            // Add styles for team totals row
            '&[data-id="team-total"]': {
              backgroundColor: (theme) =>
                selectedPlayerId === 'TEAM'
                  ? '#e3f2fd !important'  // Same blue as player selection when selected
                  : '#f5f5f5 !important',
              fontWeight: 'bold',
              borderBottom: '2px solid #ddd',
              '&:hover': {
                backgroundColor: '#edf5fd !important',  // Slightly lighter blue on hover
                cursor: 'pointer',
              },
            },
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f8f8f8',
            cursor: 'pointer',
          },
        }
      }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            sorting: {
              sortModel: [{ field: 'minutes', sort: 'desc' }],
            },
          }}
          sortingOrder={['desc', 'asc']}
          hideFooter={true}
          onRowClick={(params) => {
            if (params.row.isTotal) {
              onPlayerSelect('team-total');
            } else {
              onPlayerSelect(params.row.id);
            }
          }}
          disableColumnMenu
          disableSelectionOnClick={true}
          selectionModel={
            selectedPlayerId === 'TEAM' ? ['team-total'] :
              (selectedTeam === teamIdentifier && selectedPlayerId) ?
                [selectedPlayerId] :
                []
          }
          onSelectionModelChange={() => { }}
          autoHeight
          density="compact"
          disableColumnResize
          style={{ width: '100%' }}
          sx={{
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'hidden !important',
            }
          }}
        />
      </Box>
    </div>
  );
};

export default TeamPanel; 