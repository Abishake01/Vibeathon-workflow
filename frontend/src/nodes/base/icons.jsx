/**
 * Icon Registry
 * Centralized icon definitions for all node types
 */

import React from 'react';
import { 
  FiGlobe, FiGitBranch, FiEdit3, FiCode, FiGitMerge, 
  FiSend, FiFilter, FiDatabase, FiFileText, FiTrendingUp,
  FiUsers, FiMessageSquare, FiHash, FiFile, FiCalendar, FiSearch
} from 'react-icons/fi';
import { 
  BiNetworkChart, BiBrain, BiData
} from 'react-icons/bi';
import { 
  SiOpenai, SiGoogle, SiGooglesheets
} from 'react-icons/si';
import { AiOutlineRobot } from 'react-icons/ai';

export const icons = {
  // React Icons - Feather
  FiGlobe: <FiGlobe />,
  FiGitBranch: <FiGitBranch />,
  FiEdit3: <FiEdit3 />,
  FiCode: <FiCode />,
  FiGitMerge: <FiGitMerge />,
  FiSend: <FiSend />,
  FiFilter: <FiFilter />,
  FiDatabase: <FiDatabase />,
  FiFileText: <FiFileText />,
  FiTrendingUp: <FiTrendingUp />,
  FiUsers: <FiUsers />,
  FiMessageSquare: <FiMessageSquare />,
  FiHash: <FiHash />,
  FiFile: <FiFile />,
  FiCalendar: <FiCalendar />,
  FiSearch: <FiSearch />,
  
  // React Icons - BoxIcons
  BiNetworkChart: <BiNetworkChart />,
  BiBrain: <BiBrain />,
  BiData: <BiData />,
  
  // React Icons - Simple Icons
  SiOpenai: <SiOpenai />,
  SiGoogle: <SiGoogle />,
  SiGooglesheets: <SiGooglesheets />,
  
  // React Icons - Ant Design
  AiOutlineRobot: <AiOutlineRobot />
};

/**
 * Get icon component by name
 * @param {string} iconName - Name of the icon
 * @returns {React.Component} Icon component
 */
export const getIcon = (iconName) => {
  return icons[iconName] || icons.FiGlobe;
};

